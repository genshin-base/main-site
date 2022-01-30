import {
	ControlLayer,
	drawRectTilePlaceholder,
	loadTileImage,
	LocMap,
	SmoothTileContainer,
	TileContainer,
	TileLayer,
} from 'locmap'
import { useEffect, useRef } from 'preact/hooks'

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
checkAvifSupport().then(ok => ok && (tileExt = 'avif'))

function tilePathFinc(x: number, y: number, z: number, mapCode: MapCode) {
	return `https://genshin-base.github.io/teyvat-map/v2.4/tiles/${mapCode}/${tileExt}/${z}/${x}/${y}.${tileExt}`
}

/** @type {import('locmap').ProjectionConverter} */
const MapProjection = {
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

export type MapMarkerStyle = null | 'circle' | 'outline'
export type MapMarkerRaw = { map: MapCode; x: number; y: number; icon: string; style?: MapMarkerStyle }
type MapMarker = {
	map: MapCode
	x: number
	y: number
	icon: null | HTMLImageElement | HTMLCanvasElement
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
		tileContainer: TileContainer
	} | null>(null)
	const mapCodeRef = useRef<MapCode>('teyvat')

	/*
	const markers_ = useFetch(() => apiGetJSONFile(`generated/locations.json`) as Promise<any[]>, [])
	if (isLoaded(markers_))
		markers = markers_
			.filter(x => x.locations.length > 0 && x.type === 'domain')
			.map(x => ({
				x: x.locations[0][0],
				y: x.locations[0][1],
				icon,
			}))
	*/

	useEffect(() => {
		if (!wrapRef.current) return

		const loadTile = loadTileImage((x, y, z) => tilePathFinc(x, y, z, mapCodeRef.current))
		const tileContainer = new SmoothTileContainer(TILE_DRAW_WIDTH, loadTile, drawRectTilePlaceholder)

		const map = new LocMap(wrapRef.current, MapProjection)
		const markersLayer = new MarkersLayer()
		map.setZoomRange(2 ** MIN_LEVEL * TILE_CONTENT_WIDTH, 2 ** MAX_LEVEL * TILE_CONTENT_WIDTH)
		map.register(new TileLayer(tileContainer))
		map.register(markersLayer)
		map.register(new ControlLayer())
		map.requestRedraw()
		map.resize()

		addEventListener('resize', map.resize)
		mapRef.current = { map, markersLayer, tileContainer }

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
		if (marker.map !== mapCode) continue
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
	private iconCache: Map<string, HTMLImageElement | HTMLCanvasElement> = new Map()
	private mapCode: MapCode = 'teyvat'

	private loadMarkerImg(marker: MapMarker, src: string) {
		const cachedImg = this.iconCache.get(src + '|' + marker.style)
		if (cachedImg) {
			marker.icon = cachedImg
			this.map?.requestRedraw()
		} else {
			const img = new Image()
			img.src = src
			img.onload = () => {
				marker.icon =
					marker.style === 'outline'
						? makeCanvasWithShadow(img, 1, 'black') //
						: img
				this.map?.requestRedraw()
			}
		}
	}

	setMapCode(mapCode: MapCode) {
		this.mapCode = mapCode
	}

	setMarkers(rawMarkers: MapMarkerRaw[]) {
		this.markers.length = 0
		{
			const cache = this.iconCache
			cache.clear()
			for (const key of cache.keys()) {
				if (cache.size < 30) break
				cache.delete(key)
			}
		}
		for (const { map, x, y, icon: src, style = null } of rawMarkers) {
			const marker = { map, x, y, icon: null, style }
			this.loadMarkerImg(marker, src)
			this.markers.push(marker)
		}
	}

	redraw(map: LocMap) {
		const rc = map.get2dContext()
		if (!rc) return

		const [viewX, viewY] = map.getViewBoxShift()

		for (let i = 0, markers = this.markers; i < markers.length; i++) {
			const marker = markers[i]
			if (marker.map !== this.mapCode) continue

			const x = map.lon2x(marker.x) - viewX
			const y = map.lat2y(marker.y) - viewY
			const downscale = Math.min(1, (map.getZoom() / TILE_DRAW_WIDTH - 1) / 2 + 1)
			const size = MARKER_ICON_SIZE_PX * downscale
			const lineW = 1.5 * downscale
			const isCircled = marker.style === 'circle'

			if (isCircled) {
				rc.beginPath()
				rc.arc(x, y, size / 2 + lineW / 2 + 0.75, 0, Math.PI * 2, false)
				rc.fillStyle = '#333'
				rc.fill()
			}

			const img = marker.icon
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
