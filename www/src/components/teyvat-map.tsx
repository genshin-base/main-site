import {
	ControlLayer,
	drawRectTilePlaceholder,
	loadTileImage,
	LocMap,
	MapEventHandlers,
	ProjectionConverter,
	SmoothTileContainer,
	TileContainer,
	TileImgLoadFunc,
	TileLayer,
	TilePlaceholderDrawFunc,
} from 'locmap'
import { useEffect, useRef } from 'preact/hooks'
import { makeTileMaskChecker, TileLayerSummary } from 'teyvat-map/tiles/summary'

import { MapCode } from '#lib/genshin'
import { clamp } from '#lib/utils/values'
import { checkAvifSupport } from '#lib/utils/web_media'
import { memo } from '#src/utils/preact-compat'

const TILE_DRAW_WIDTH = 192
const TILE_CONTENT_WIDTH = 256 //tile width in game pixels on layer 0
const MIN_LEVEL = -5.5
const MAX_LEVEL = 1
const DEFAULT_LEVEL = -1.2
const MARKERS_AUTO_REGION_DOWNSCALE = 1.1
const MARKER_ICON_SIZE_PX = 40

type TileExt = 'jpg' | 'avif'

let tileExt: TileExt = 'jpg'
if (!BUNDLE_ENV.IS_SSR) checkAvifSupport().then(ok => ok && (tileExt = 'avif'))

const TILES_ROOT = `https://genshin-base.github.io/teyvat-map/v2.6/tiles`

function tilePathFinc(x: number, y: number, z: number, mapCode: MapCode) {
	return `${TILES_ROOT}/${mapCode}/${tileExt}/${z}/${x}/${y}.${tileExt}`
}

const lowestLayerSummaries: Record<string, TileLayerSummary | undefined> = {}
const tilesMask: Record<string, ReturnType<typeof makeTileMaskChecker> | undefined> = {}
if (!BUNDLE_ENV.IS_SSR)
	fetch(`${TILES_ROOT}/summary.json`)
		.then(r => r.json())
		.then((summaries: Record<string, TileLayerSummary[]>) => {
			for (const code in summaries) {
				lowestLayerSummaries[code] = summaries[code][0]
				tilesMask[code] = makeTileMaskChecker(summaries[code])
			}
		})

const MapProjection: ProjectionConverter = {
	x2lon(x, zoom) {
		return (x / zoom) * TILE_CONTENT_WIDTH
	},
	y2lat(y, zoom) {
		return (y / zoom) * TILE_CONTENT_WIDTH
	},

	lon2x(lon, zoom) {
		return (lon * zoom) / TILE_CONTENT_WIDTH
	},
	lat2y(lat, zoom) {
		return (lat * zoom) / TILE_CONTENT_WIDTH
	},

	meters2pixCoef(lat, zoom) {
		return zoom / TILE_CONTENT_WIDTH
	},
}

export type MapMarkerStyle = null | undefined | 'circle' | 'outline'
export type MapMarkerRaw = { mapCode: MapCode; x: number; y: number; icon: string; style?: MapMarkerStyle }
type MapMarkerIcon = { img: null | HTMLImageElement | HTMLCanvasElement }
type MapMarker = {
	mapCode: MapCode
	x: number
	y: number
	icon: MapMarkerIcon
	style: MapMarkerStyle
}

export const TeyvatMap = memo(function TeyvatMap({
	classes,
	mapCode,
	pos,
	markers,
}: {
	classes?: string
	mapCode: MapCode
	pos: { x: number; y: number; level: number } | 'auto'
	markers?: MapMarkerRaw[]
}) {
	const wrapRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<{
		map: LocMap
		markersLayer: MarkersLayer
		movementClampLayer: MovementClampLayer
		tileContainer: TileContainer
	} | null>(null)
	const mapCodeRef = useRef<MapCode>('teyvat')

	useEffect(() => {
		if (!wrapRef.current) return

		function shouldDrawTile(x: number, y: number, z: number) {
			const mask = tilesMask[mapCodeRef.current]
			return !mask || mask(x, y, z)
		}

		const drawTilePlaceholder: TilePlaceholderDrawFunc = (map, x, y, z, drawX, drawY, tileW, scale) => {
			if (shouldDrawTile(x, y, z)) drawRectTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale)
		}

		const loadTileInner = loadTileImage((x, y, z) => tilePathFinc(x, y, z, mapCodeRef.current))
		const loadTile: TileImgLoadFunc = (x, y, z, onUpdate) => {
			if (shouldDrawTile(x, y, z)) loadTileInner(x, y, z, onUpdate)
		}
		const tileContainer = new SmoothTileContainer(TILE_DRAW_WIDTH, loadTile, drawTilePlaceholder)

		const map = new LocMap(wrapRef.current, MapProjection)
		const markersLayer = new MarkersLayer()
		const movementClampLayer = new MovementClampLayer()
		map.setZoomRange(2 ** MIN_LEVEL * TILE_CONTENT_WIDTH, 2 ** MAX_LEVEL * TILE_CONTENT_WIDTH)
		map.register(movementClampLayer)
		map.register(new TileLayer(tileContainer))
		map.register(markersLayer)
		map.register(new ControlLayer())
		map.requestRedraw()
		map.resize()

		addEventListener('resize', map.resize)
		mapRef.current = { map, markersLayer, movementClampLayer, tileContainer }

		return () => {
			map.getLayers().forEach(map.unregister)
			removeEventListener('resize', map.resize)
			mapRef.current = null
		}
	}, [])

	useEffect(() => {
		const m = mapRef.current
		mapCodeRef.current = mapCode
		m?.markersLayer.setMapCode(mapCode)
		m?.movementClampLayer.setMapCode(mapCode)
		m?.tileContainer.clearCache()
		m?.map.requestRedraw()
	}, [mapCode])

	useEffect(() => {
		mapRef.current?.markersLayer.setMarkers(markers ?? [])
	}, [markers])

	useEffect(() => {
		const map = mapRef.current?.map
		if (!map) return
		const { x, y, level } = pos === 'auto' ? calcAutoPosition(map, markers ?? [], mapCode) : pos
		map.updateLocation(x, y, TILE_CONTENT_WIDTH * 2 ** level)
	}, [pos, markers, mapCode])

	return <div ref={wrapRef} class={'teyvat-map ' + classes}></div>
})

function calcAutoPosition(map: LocMap, markers: MapMarkerRaw[], mapCode: MapCode) {
	let xMin = 1e10
	let xMax = -1e10
	let yMin = 1e10
	let yMax = -1e10
	for (const marker of markers) {
		if (marker.mapCode !== mapCode) continue
		if (xMin > marker.x) xMin = marker.x
		if (xMax < marker.x) xMax = marker.x
		if (yMin > marker.y) yMin = marker.y
		if (yMax < marker.y) yMax = marker.y
	}

	const [w, h] = map.getViewBoxSize()
	const zoom = Math.min(w / (xMax - xMin), h / (yMax - yMin)) / MARKERS_AUTO_REGION_DOWNSCALE
	// zoom==inf -> one marker, zoom<0 -> no markers
	let level = zoom === Infinity || zoom < 0 ? DEFAULT_LEVEL : Math.log2(zoom)
	level = clamp(MIN_LEVEL, level, MAX_LEVEL)

	return { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2, level }
}

class MarkersLayer {
	private map: LocMap | null = null
	private markers: MapMarker[] = []
	private iconCache: Map<string, MapMarkerIcon> = new Map()
	private mapCode: MapCode = 'teyvat'

	private loadMarkerImg(src: string, style: MapMarkerStyle) {
		const key = src + '|' + style
		const cachedIcon = this.iconCache.get(key)
		if (cachedIcon) {
			if (cachedIcon.img) this.map?.requestRedraw()
			return cachedIcon
		} else {
			const img = new Image()
			const icon: MapMarkerIcon = { img: null }
			img.src = src
			img.onload = () => {
				icon.img =
					style === 'outline'
						? makeCanvasWithShadow(img, 1, 'black') //
						: img
				this.map?.requestRedraw()
			}
			this.iconCache.set(key, icon)
			return icon
		}
	}

	setMapCode(mapCode: MapCode) {
		this.mapCode = mapCode
	}

	setMarkers(rawMarkers: MapMarkerRaw[]) {
		this.markers.length = 0
		{
			const cache = this.iconCache
			for (const key of cache.keys()) {
				if (cache.size < 30) break
				cache.delete(key)
			}
		}
		for (const raw of rawMarkers) {
			const marker = { ...raw, icon: this.loadMarkerImg(raw.icon, raw.style), style: raw.style }
			this.markers.push(marker)
		}
	}

	redraw(map: LocMap) {
		const rc = map.get2dContext()
		if (!rc) return

		const [viewX, viewY] = map.getViewBoxShift()
		const zoomDownscale = Math.min(1, (map.getZoom() / TILE_DRAW_WIDTH - 1) / 2 + 1)

		for (let i = 0, markers = this.markers; i < markers.length; i++) {
			const marker = markers[i]
			if (marker.mapCode !== this.mapCode) continue

			const x = map.lon2x(marker.x) - viewX
			const y = map.lat2y(marker.y) - viewY
			const size = MARKER_ICON_SIZE_PX * zoomDownscale
			const lineW = 1.5 * zoomDownscale
			const isCircled = marker.style === 'circle'

			if (isCircled) {
				rc.beginPath()
				rc.arc(x, y, size / 2 + lineW / 2 + 0.75, 0, Math.PI * 2, false)
				rc.fillStyle = '#333'
				rc.fill()
			}

			const img = marker.icon.img
			if (img !== null) {
				const isImg = 'naturalWidth' in img
				const nw = isImg ? img.naturalWidth : img.width
				const nh = isImg ? img.naturalHeight : img.height
				const scale = Math.min(size / nw, size / nh)
				const w = nw * scale
				const h = nh * scale
				if (isCircled) {
					rc.save()
					rc.beginPath()
					rc.arc(x, y, size / 2 - lineW / 2 - 0.75, 0, Math.PI * 2, false)
					rc.clip()
				}
				rc.drawImage(img, x - w / 2, y - h / 2, w, h)
				if (isCircled) {
					rc.restore()
				}
			}

			if (isCircled) {
				rc.beginPath()
				rc.arc(x, y, size / 2, 0, Math.PI * 2, false)
				rc.strokeStyle = 'white'
				rc.lineWidth = lineW
				rc.stroke()
			}
		}
	}

	register(map: LocMap) {
		this.map = map
	}

	unregister(map: LocMap) {
		this.map = null
		this.markers.length = 0
	}
}

function makeCanvasWithShadow(img: HTMLImageElement, blur: number, color: string) {
	const canvas = document.createElement('canvas')
	canvas.width = img.naturalWidth
	canvas.height = img.naturalHeight
	const rc = canvas.getContext('2d')
	if (rc) {
		rc.shadowBlur = blur
		rc.shadowColor = color
		for (let i = 0; i < 3; i++) rc.drawImage(img, 0, 0)
	}
	return canvas
}

class MovementClampLayer {
	private mapCode: MapCode = 'teyvat'
	private isGrabbing = false
	private isZoomIn = false
	// расширение границ таскаяни, в координатах карты
	private xOffset = 0
	private yOffset = 0

	onEvent: MapEventHandlers = (() => {
		const down = () => {
			this.isGrabbing = true
		}
		const up = (map: LocMap) => {
			this.isGrabbing = false
			map.requestRedraw()
		}
		let zoomInTimeout = 0
		const stopZoomIn = (map: LocMap) => {
			this.isZoomIn = false
			map.requestRedraw()
		}
		return {
			singleDown: down,
			singleUp: up,
			doubleDown: down,
			doubleUp: up,
			mapZoom: (map, { delta }) => {
				if (delta > 1) {
					this.isZoomIn = true
					clearTimeout(zoomInTimeout)
					zoomInTimeout = window.setTimeout(stopZoomIn, 100, map)
				}
			},
		}
	})()

	redraw(map: LocMap) {
		const summary = lowestLayerSummaries[this.mapCode]
		if (!summary) return

		if (!this.isGrabbing) {
			this.xOffset *= 0.9
			this.yOffset *= 0.9
		}
		let [dLon, dLat] = this.getLonLatDelta(map, summary)
		if (this.isGrabbing || this.isZoomIn) {
			// В режиме увеличения границы раздвигаются вместе (одинаково) с перемещением,
			// так что они не мешают и не сдвигают карту. А после зума будут плавно сдвинуты обратно.
			// В режиме таскания границы раздвигаются медленее перемещения карты.
			// Это создаёт эффект "трения": карта у границ начинает двигаться медленее, чем курсор.
			const k = this.isZoomIn ? 1 : 0.25
			this.xOffset += Math.abs(dLon) * k
			this.yOffset += Math.abs(dLat) * k
			;[dLon, dLat] = this.getLonLatDelta(map, summary)
		}

		const dx = map.lon2x(dLon)
		const dy = map.lat2y(dLat)

		if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
			map.move(dx, dy)
		}
	}

	setMapCode(code: MapCode) {
		this.mapCode = code
	}

	private getLonLatDelta(map: LocMap, summary: TileLayerSummary): [number, number] {
		// eslint-disable-next-line prefer-const
		let [layer, [left, top, right, bottom]] = summary
		right += 1
		bottom += 1
		const layerScale = TILE_CONTENT_WIDTH * 0.5 ** layer
		left *= layerScale
		top *= layerScale
		right *= layerScale
		bottom *= layerScale

		const [viewWidth, viewHeight] = map.getViewBoxSize()
		const hBorder = map.x2lon(viewWidth / 2)
		const vBorder = map.y2lat(viewHeight / 2)
		left += hBorder
		right -= hBorder
		top += vBorder
		bottom -= vBorder

		if (right < left) left = right = (left + right) / 2
		if (bottom < top) top = bottom = (top + bottom) / 2
		left -= this.xOffset
		right += this.xOffset
		top -= this.yOffset
		bottom += this.yOffset

		const lon = map.getLon()
		const lat = map.getLat()

		let dLon = 0
		let dLat = 0
		if (lon < left) dLon = lon - left
		if (lon > right) dLon = lon - right
		if (lat < top) dLat = lat - top
		if (lat > bottom) dLat = lat - bottom
		return [dLon, dLat]
	}
}
