import { promises as fs } from 'fs'
import { getFileCached } from '#lib/requests.js'
import { progress, warn } from '#lib/utils/logs.js'
import { getEnemyCodeFromName } from '#lib/genshin.js'

/**
 * @param {string} cacheDir
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 */
export async function applyEnemiesLocations(cacheDir, code2enemy) {
	const bossIds = new Set()
	{
		const data = await getMapJson('label/tree', '2', cacheDir)

		const title = 'Enemies (Boss)'
		const bosses = (function search(roots) {
			for (const root of roots) {
				if (root.name === title) return root
				const res = search(root.children)
				if (res !== null) return res
			}
			return null
		})(data.data.tree)
		if (bosses === null) {
			warn(`bosses locations: can not find category '${title}' on map, skipping`)
			return
		}
		for (const boss of bosses.children) bossIds.add(boss.id)
	}

	{
		const data = await getMapJson('point/list', '2', cacheDir)

		const mapId2enemy = /**@type {Map<number, import('#lib/parsing').EnemyData>}*/ (new Map())
		for (const label of data.data.label_list) {
			if (!bossIds.has(label.id)) continue
			const code = getEnemyCodeFromName(label.name)
			if (code in code2enemy) mapId2enemy.set(label.id, code2enemy[code])
			else warn(`boss '${label.name}' (from map category) is unknown`)
		}

		for (const point of data.data.point_list) {
			const enemy = mapId2enemy.get(point.id)
			if (enemy)
				enemy.locations.push([
					Math.round(mustGetNumber(point, 'x_pos')),
					Math.round(mustGetNumber(point, 'y_pos')),
				])
		}
	}
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
	const fpath = `${cacheDir}/mihoyo/${path.replace(/\//g, '-')}-${mapId}.html`
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
