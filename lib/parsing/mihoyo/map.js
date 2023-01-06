import { promises as fs } from 'fs'
import { getFileCached } from '#lib/requests.js'
import { progress, warn } from '#lib/utils/logs.js'
import { getEnemyCodeFromName } from '#lib/genshin.js'

/** @type {Map<import('#lib/genshin.js').MapCode, string>} */
const mapCode2mihoyoId = new Map([
	['teyvat', '2'],
	['enkanomiya', '7'],
	['chasm', '9'],
])

/**
 * Сдвиг карты, по умолчанию (0,0).
 * @type {Partial<Record<import('#lib/genshin.js').MapCode, {x:number, y:number}|undefined>>}
 */
const mapOffsets = {
	chasm: { x: -22, y: -150 },
}

/**
 * @param {string} cacheDir
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2EnemyGroupData} code2group
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('./fixes').MihoyoFixes} fixes
 */
export async function applyItemsLocations(cacheDir, code2enemy, code2group, code2item, code2domain, fixes) {
	for (const [mapCode, mapId] of mapCode2mihoyoId.entries()) {
		const data = await getMapJson('point/list', mapId, cacheDir)

		const labelId2points = /**@type {Map<number, any[]>}*/ (new Map())
		for (const point of data.data.point_list) {
			const points = labelId2points.get(point.label_id)
			if (points) points.push(point)
			else labelId2points.set(point.label_id, [point])
		}

		for (const label of data.data.label_list) {
			const points = labelId2points.get(label.id)
			if (!points) continue

			const fix = fixes.map.search.find(x => x.nameOnMap === label.name)
			if (fix) fix._used = true

			let code = fix ? fix.useCode : getEnemyCodeFromName(label.name)
			if (code + 's' in code2enemy || code + 's' in code2group || code + 's' in code2item) code += 's'

			code2enemy[code]?.locations.push(...getPointsLocations(points, mapCode))
			code2group[code]?.locations.push(...getPointsLocations(points, mapCode))
			code2item[code]?.locations.push(...getPointsLocations(points, mapCode))
		}
	}

	const expectedItems = Object.values(code2item).filter(x =>
		x.types.some(x => x === 'character-material-local'),
	)
	const expectedDropTypeCodes = [
		'character-material-secondary',
		'character-material-talent',
		'weapon-material-secondary',
	]
	const expectedEnemies = Object.values(code2enemy).filter(x =>
		x.drop.itemCodes.some(itemCode => {
			const item = code2item[itemCode]
			return item.types.some(x => expectedDropTypeCodes.includes(x))
		}),
	)
	const expectedEnemyGroups = Object.values(code2group).filter(group =>
		group.enemyCodes.some(enemyCode => expectedEnemies.some(x => x.code === enemyCode)),
	)
	for (let i = 0; i < expectedEnemies.length; i++) {
		const enemyCode = expectedEnemies[i].code
		let shouldRemove = false
		for (const group of expectedEnemyGroups) {
			if (group.enemyCodes.includes(enemyCode)) {
				shouldRemove = true
				break
			}
		}
		for (const code in code2domain)
			if (code2domain[code].bossCode === enemyCode) {
				shouldRemove = true
				break
			}
		if (shouldRemove) expectedEnemies.splice(i--, 1)
	}

	for (const item of expectedItems)
		if (item.locations.length === 0) warn(`mihoyo map: no locations for item '${item.code}'`)
	for (const enemy of expectedEnemies)
		if (enemy.locations.length === 0) warn(`mihoyo map: no locations for enemy '${enemy.code}'`)
	for (const group of expectedEnemyGroups)
		if (group.locations.length === 0) warn(`mihoyo map: no locations for group '${group.code}'`)

	// sorting locations
	const mapCodes = [...mapCode2mihoyoId.keys()]
	for (const group of [code2enemy, code2group, code2item])
		for (const code in group)
			group[code].locations.sort((a, b) => {
				return mapCodes.indexOf(a.mapCode) - mapCodes.indexOf(b.mapCode) || a.x - b.x || a.y - b.y
			})
}

/**
 * @param {any[]} points
 * @param {import('#lib/genshin').MapCode} mapCode
 * @returns {import('#lib/genshin').MapLocation[]}
 */
function getPointsLocations(points, mapCode) {
	const offset = mapOffsets[mapCode] ?? { x: 0, y: 0 }
	return points.map(point => ({
		mapCode,
		x: Math.round(mustGetNumber(point, 'x_pos')) + offset.x,
		y: Math.round(mustGetNumber(point, 'y_pos')) + offset.y,
	}))
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
