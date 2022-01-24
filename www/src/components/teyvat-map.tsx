import {
	ControlLayer,
	drawRectTilePlaceholder,
	loadTileImage,
	LocMap,
	SmoothTileContainer,
	TileLayer,
} from 'locmap'
import { useEffect, useRef } from 'preact/hooks'

import { clamp } from '#lib/utils/values'
import { checkAvifSupport, imgIsReady } from '#lib/utils/web_media'
import { memo } from '#src/utils/preact-compat'

const TILE_DRAW_WIDTH = 192
const TILE_CONTENT_WIDTH = 256 //tile width in game pixels on layer 0
const MIN_LEVEL = -5.5
const MAX_LEVEL = 1
const DEFAULT_LEVEL = -1.2
const MARKERS_AUTO_REGION_DOWNSCALE = 1.1
const MARKER_ICON_SIZE_PX = 40

let tileExt = 'jpg'
checkAvifSupport().then(ok => ok && (tileExt = 'avif'))

const loadTile = loadTileImage(
	(x, y, z) => `https://genshin-base.github.io/teyvat-map/v2.2/tiles/${tileExt}/${z}/${x}/${y}.${tileExt}`,
)

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

export type MapMarkerRaw = { x: number; y: number; icon: string; style?: null | 'circle' }
type MapMarker = { x: number; y: number; icon: HTMLImageElement; style: null | 'circle' }

export const TeyvatMap = memo(function TeyvatMap({
	classes,
	pos,
	markers,
}: {
	classes?: string
	pos: { x: number; y: number; level: number } | 'auto'
	markers?: MapMarkerRaw[]
}) {
	const wrapRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<LocMap | null>(null)
	const markersLayerRef = useRef<MarkersLayer | null>(null)

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

		const map = new LocMap(wrapRef.current, MapProjection)
		const markersLayer = new MarkersLayer()
		map.setZoomRange(2 ** MIN_LEVEL * TILE_CONTENT_WIDTH, 2 ** MAX_LEVEL * TILE_CONTENT_WIDTH)
		map.register(
			new TileLayer(new SmoothTileContainer(TILE_DRAW_WIDTH, loadTile, drawRectTilePlaceholder)),
		)
		map.register(markersLayer)
		map.register(new ControlLayer())
		map.requestRedraw()
		map.resize()
		addEventListener('resize', map.resize)
		mapRef.current = map
		markersLayerRef.current = markersLayer

		return () => {
			map.getLayers().forEach(map.unregister)
			removeEventListener('resize', map.resize)
			mapRef.current = null
			markersLayerRef.current = null
		}
	}, [])

	useEffect(() => {
		if (markers) markersLayerRef.current?.setMarkers(markers)
	}, [markers])

	useEffect(() => {
		const map = mapRef.current
		if (!map) return
		const { x, y, level } = pos === 'auto' ? calcAutoPosition(map, markers ?? []) : pos
		map.updateLocation(x, y, TILE_CONTENT_WIDTH * 2 ** level)
	}, [pos, markers])

	return <div ref={wrapRef} class={'teyvat-map ' + classes}></div>
})

function calcAutoPosition(map: LocMap, markers: MapMarkerRaw[]) {
	let xMin = 1e10
	let xMax = -1e10
	let yMin = 1e10
	let yMax = -1e10
	for (const marker of markers) {
		if (xMin > marker.x) xMin = marker.x
		if (xMax < marker.x) xMax = marker.x
		if (yMin > marker.y) yMin = marker.y
		if (yMax < marker.y) yMax = marker.y
	}
	const [w, h] = map.getViewBoxSize()
	const zoom = Math.min(w / (xMax - xMin), h / (yMax - yMin)) / MARKERS_AUTO_REGION_DOWNSCALE
	let level = zoom === Infinity ? DEFAULT_LEVEL : Math.log2(zoom)
	level = clamp(MIN_LEVEL, level, MAX_LEVEL)
	return { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2, level }
}

class MarkersLayer {
	private map: LocMap | null = null
	private markers: MapMarker[] = []
	private onIconLoad: () => unknown

	constructor() {
		this.onIconLoad = () => this.map?.requestRedraw()
	}

	setMarkers(rawMarkers: MapMarkerRaw[]) {
		this.markers.length = 0
		for (const { x, y, icon: src, style = null } of rawMarkers) {
			const icon = new Image()
			icon.src = src
			icon.onload = this.onIconLoad
			this.markers.push({ x, y, icon, style })
		}
	}

	redraw(map: LocMap) {
		const rc = map.get2dContext()
		if (!rc) return

		const [viewX, viewY] = map.getViewBoxShift()

		for (let i = 0, markers = this.markers; i < markers.length; i++) {
			const marker = markers[i]

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
			if (imgIsReady(img)) {
				const nw = img.naturalWidth
				const nh = img.naturalHeight
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
