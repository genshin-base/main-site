import { promises as fs } from 'fs'
import { getFileCached } from '#lib/requests.js'
import { progress } from '#lib/utils/logs.js'
import { getEnemyCodeFromName } from '#lib/genshin.js'

/**
 * @param {string} cacheDir
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2EnemyGroupData} code2group
 */
export async function applyEnemiesLocations(cacheDir, code2enemy, code2group) {
	const mapId2label = /**@type {Map<number, {id:number, name:string}>}*/ (new Map())
	{
		const data = await getMapJson('label/tree', '2', cacheDir)
		;(function search(roots) {
			for (const root of roots) {
				mapId2label.set(root.id, { id: root.id, name: root.name })
				search(root.children)
			}
		})(data.data.tree)
	}

	{
		const data = await getMapJson('point/list', '2', cacheDir)

		const labelId2points = /**@type {Map<number, any[]>}*/ (new Map())
		for (const point of data.data.point_list) {
			const points = labelId2points.get(point.label_id)
			if (points) points.push(point)
			else labelId2points.set(point.label_id, [point])
		}

		for (const label of data.data.label_list) {
			const points = labelId2points.get(label.id)
			if (!points) continue

			const code = getEnemyCodeFromName(label.name)
			if (code in code2enemy) code2enemy[code].locations.push(...getPointsLocations(points))
			else if (code in code2group) code2group[code].locations.push(...getPointsLocations(points))
		}
	}

	const locSort = (a, b) => a[0] - b[0] || a[1] - b[1]
	for (const enemy of Object.values(code2enemy)) enemy.locations.sort(locSort)
	for (const group of Object.values(code2group)) group.locations.sort(locSort)
}

function getPointsLocations(points) {
	return points.map(point => [
		Math.round(mustGetNumber(point, 'x_pos')),
		Math.round(mustGetNumber(point, 'y_pos')),
	])
}

const MAP_BASE = 'https://api-os-takumi-static.mihoyo.com/common/map_user/ys_obc/v1/map'

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} mapId
 * @returns {Promise<any>}
 */
async function getMapJson(path, mapId, cacheDir) {
	await fs.mkdir(`${cacheDir}/mihoyo`, { recursive: true })
	const url = `${MAP_BASE}/${path}?map_id=${mapId}&app_sn=ys_obc&lang=en-us`
	const fpath = `${cacheDir}/mihoyo/${path.replace(/\//g, '-')}-${mapId}.json`
	const cacheUsed = await getFileCached(url, null, fpath, false, Infinity)
	if (!cacheUsed) progress()
	return JSON.parse(await fs.readFile(fpath, { encoding: 'utf-8' }))
}

/**
 * @param {any} obj
 * @param {string} attr
 */
function mustGetNumber(obj, attr) {
	const val = obj[attr]
	if (typeof val !== 'number') throw new Error(`expected '${attr}' to be number, got ${typeof val}`)
	return val
}
