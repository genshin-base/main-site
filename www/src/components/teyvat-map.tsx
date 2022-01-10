import {
	ControlLayer,
	drawRectTilePlaceholder,
	loadTileImage,
	LocMap,
	SmoothTileContainer,
	TileLayer,
} from 'locmap'
import { useEffect, useRef } from 'preact/hooks'

const TILE_WIDTH = 192

const tileExt = 'avif'

const loadTile = loadTileImage(
	(x, y, z) => `https://genshin-base.github.io/teyvat-map/v2.2/tiles/${tileExt}/${z}/${x}/${y}.${tileExt}`,
)

/** @type {import('locmap').ProjectionConverter} */
const MapProjection = {
	x2lon(x, zoom) {
		return (x / zoom) * TILE_WIDTH
	},
	y2lat(y, zoom) {
		return (y / zoom) * TILE_WIDTH
	},

	lon2x(lon, zoom) {
		return (lon * zoom) / TILE_WIDTH
	},
	lat2y(lat, zoom) {
		return (lat * zoom) / TILE_WIDTH
	},

	meters2pixCoef(lat, zoom) {
		return zoom / TILE_WIDTH
	},
}

export function TeyvatMap({
	classes,
	x,
	y,
	level,
}: {
	classes?: string
	x: number
	y: number
	level: number
}) {
	const wrapRef = useRef<HTMLDivElement>(null)
	const mapRef = useRef<LocMap | null>(null)

	useEffect(() => {
		if (!wrapRef.current) return

		const map = new LocMap(wrapRef.current, MapProjection)
		map.setZoomRange(8, 512)
		map.register(new TileLayer(new SmoothTileContainer(TILE_WIDTH, loadTile, drawRectTilePlaceholder)))
		map.register(new ControlLayer())
		map.requestRedraw()
		map.resize()
		addEventListener('resize', map.resize)
		mapRef.current = map

		return () => {
			map.getLayers().forEach(map.unregister)
			removeEventListener('resize', map.resize)
			mapRef.current = null
		}
	}, [])

	useEffect(() => {
		const map = mapRef.current
		if (map) map.updateLocation(x, y, TILE_WIDTH * 2 ** level)
	}, [x, y, level])

	return (
		<div
			ref={wrapRef}
			class={'teyvat-map ' + classes}
			style={{ position: 'relative', height: '16000px' }}
		></div>
	)
}
