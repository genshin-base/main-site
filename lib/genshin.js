import { setDayStartUTC, weekdayAsMonSun } from './utils/date.js'

/** @typedef {'pyro' | 'electro' | 'hydro' | 'dendro' | 'cryo' | 'anemo' | 'geo'} GI_ElementCode */
/** @typedef {'claymore' | 'sword' | 'catalyst' | 'polearm' | 'bow'} GI_WeaponTypeCode */
/** @typedef {'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'} GI_ArtifactTypeCode */
/** @typedef {1 | 2 | 3 | 4 | 5} GI_RarityCode */
/**
 * @typedef {'wishes'|'event-wishes'|'events'|'battle-pass'|'in-game-shop'|
 *   'forging'|'fishing'|'npc-shop'|'chests'|'quest'|'puzzle'|'investigation'|
 *   'adventure-rank-10'|'playstation'} GI_WeaponObtainSource
 */
/** @typedef {'limited'|'unlimited'} GI_DomainTypeCode */

/** @typedef {{mapCode:MapCode, x:number, y:number}} MapLocation */

/** @typedef {'teyvat'|'enkanomiya'} MapCode */
/** @type {MapCode[]} */
export const GI_MAP_CODES = ['teyvat', 'enkanomiya']

/** @typedef {'mondstadt'|'liyue'|'inazuma'} GI_RegionCode */
/** @type {GI_RegionCode[]} */
export const GI_REGION_CODES = ['mondstadt', 'liyue', 'inazuma']

/** @typedef {'europe'|'asia'|'north-america'} GI_ServerRegionCode */
/** @type {GI_ServerRegionCode[]} */
export const GI_SERVER_REGIONS = ['europe', 'asia', 'north-america']

/** @typedef {'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'} WeekdayCode */
/** @type {WeekdayCode[]} */
export const GI_ROTATION_WEEKDAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** @type {GI_ElementCode[]} */
export const GI_ELEMENT_CODES = ['pyro', 'electro', 'hydro', 'dendro', 'cryo', 'anemo', 'geo']

/** @type {GI_WeaponTypeCode[]} */
export const GI_WEAPON_TYPE_CODES = ['claymore', 'sword', 'catalyst', 'polearm', 'bow']

/** @type {GI_ArtifactTypeCode[]} */
export const GI_ARTIFACT_TYPE_CODES = ['flower', 'plume', 'sands', 'goblet', 'circlet']

export const ART_GROUP_18_ATK_CODE = '18%-atk'
export const ART_GROUP_18_ATK_DETAIL = {
	name: '18% atk',
	rarity: 5,
}
export const ART_GROUP_18_ATK_INSIDE_CODES = ['noblesse-oblige', 'wanderers-troupe'] //todo
export const ART_GROUP_20_ER_CODE = '20%-er'
export const ART_GROUP_20_ER_DETAIL = {
	name: '20% er',
	rarity: 5,
}
export const ART_GROUP_20_ER_INSIDE_CODES = ['thundering-fury', 'crimson-witch-of-flames'] //todo

/** @type {GI_RarityCode[]} */
export const GI_RARITY_CODES = [1, 2, 3, 4, 5]

/**
 * Время (в часах) до перезапуска сервера относительно конца дня по UTC.
 * @type {Record<GI_ServerRegionCode, number>}
 */
export const GI_SERVER_RESET_OFFSET = {
	europe: 3, //время сервера UTC+1, перезапуск в 4 утра
	asia: -4, //время сервера UTC+8, перезапуск в 4 утра
	'north-america': 9, //время сервера UTC-5, перезапуск в 4 утра
}
/**
 * @param {GI_ServerRegionCode} regionCode
 * @returns {{weekdayCode:WeekdayCode, weekdayMonSun:number, resetIn:number, resetAt:Date}}
 */
export function getRegionTime(regionCode) {
	const now = new Date()
	const offset = GI_SERVER_RESET_OFFSET[regionCode]

	const lastResetDate = new Date(now)
	lastResetDate.setHours(lastResetDate.getHours() - offset)
	const weekdayMonSun = weekdayAsMonSun(lastResetDate.getUTCDay())
	setDayStartUTC(lastResetDate)
	lastResetDate.setUTCHours(offset)

	const nextResetDate = new Date(lastResetDate)
	nextResetDate.setDate(nextResetDate.getDate() + 1)

	return {
		weekdayMonSun: weekdayMonSun,
		weekdayCode: GI_ROTATION_WEEKDAY_CODES[weekdayMonSun],
		resetIn: +nextResetDate - +now,
		resetAt: nextResetDate,
	}
}

/** @param {string} name */
export function getCharacterCodeFromName(name) {
	const code = name.trim().toLocaleLowerCase().replace(/\s/g, '-')
	if (code === 'childe') return 'tartaglia'
	if (code === 'kamisato-ayaka') return 'ayaka'
	if (code === 'sangonomiya-kokomi') return 'kokomi'
	if (code === 'kaedehara-kazuha') return 'kazuha'
	if (code === 'arataki-itto') return 'itto'
	return code
}

/** @param {string} name */
export function getArtifactCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s/g, '-').replace(/'/g, '')
}

/** @param {string} name */
export function getWeaponCodeFromName(name) {
	return name
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, '-')
		.replace(/['"«»]/g, '')
}

/** @param {string} name */
export function getDomainCodeFromName(name) {
	return name
		.trim()
		.toLocaleLowerCase()
		.replace(/[\s:]+/g, '-')
		.replace(/'/g, '')
}

/** @param {string} name */
export function getItemCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s+/g, '-').replace(/'/g, '')
}

/** @param {string} name */
export function getEnemyCodeFromName(name) {
	return name
		.trim()
		.toLocaleLowerCase()
		.replace(/[\s:\-,]+/g, '-')
		.replace(/'/g, '')
}

/**
 * @template {{rarity:GI_RarityCode}} T
 * @param {T[]} items
 * @returns {T}
 */
export function getWithMaxRarity(items) {
	let maxItem = items[0]
	for (let i = 0; i < items.length; i++) if (maxItem.rarity < items[i].rarity) maxItem = items[i]
	return maxItem
}

/** @type {Record<MapCode, string>} */
const locEnc_map2code = {
	teyvat: 'T',
	enkanomiya: 'E',
}
/** @type {Record<string, MapCode>} */
const locEnc_code2map = {
	T: 'teyvat',
	E: 'enkanomiya',
}
/**
 * @param {MapLocation[]} locations
 * @param {number} [downsample]
 * @returns {string}
 */
export function encodeLocations(locations, downsample = 1) {
	if (downsample < 1 || downsample > 35 || downsample % 1 !== 0)
		throw new Error(`wrong downsample: ${downsample}`)

	const sortedLocs = locations.slice().sort((a, b) => a.x - b.x || a.y - b.y)

	let res = downsample.toString(36)
	for (const [groupMapCode, groupLetter] of Object.entries(locEnc_map2code)) {
		let xx = ''
		let yy = ''
		for (const { mapCode, x, y } of sortedLocs) {
			if (mapCode === groupMapCode) {
				xx += encodeLocNum(x, downsample)
				yy += encodeLocNum(y, downsample)
			}
		}
		if (xx || yy) res += xx + yy + groupLetter
	}
	return res
}
/**
 * @param {MapLocation[]} locations
 * @param {number} [downsample]
 * @returns {string}
 */
export function encodeLocationsChecked(locations, downsample = 1) {
	const res = encodeLocations(locations, downsample)

	const codes = Object.keys(locEnc_map2code)
	const sortedLocs = locations
		.slice()
		.sort((a, b) => codes.indexOf(a.mapCode) - codes.indexOf(b.mapCode) || a.x - b.x || a.y - b.y)
		.map(l => ({
			...l,
			x: Math.round(l.x / downsample) * downsample,
			y: Math.round(l.y / downsample) * downsample,
		}))
	const decodedLocs = decodeLocations(res)
	const inJson = JSON.stringify(sortedLocs)
	const outJson = JSON.stringify(decodedLocs)
	if (inJson !== outJson)
		throw new Error('wrong decoded locations:\n> ' + inJson + '\n> ' + outJson + '\n> ' + res)

	return res
}
/**
 * @param {string} encodedLocations
 * @returns {MapLocation[]}
 */
export function decodeLocations(encodedLocations) {
	const downsample = parseInt(encodedLocations[0], 36)
	encodedLocations = encodedLocations.slice(1)

	const locs = /**@type {MapLocation[]}*/ ([])
	while (encodedLocations) {
		let i = 0
		for (; i < encodedLocations.length; i++) {
			const mapCode = locEnc_code2map[encodedLocations[i]]
			if (mapCode) {
				const len3 = (i / 2) | 0
				for (let j = 0; j < len3; j += 3) {
					const x = decodeLocNum(encodedLocations, j, downsample)
					const y = decodeLocNum(encodedLocations, j + len3, downsample)
					locs.push({ mapCode, x, y })
				}
				break
			}
		}
		encodedLocations = encodedLocations.slice(i + 1)
	}
	return locs
}
const LOC_NUM_ENC_OFFSET = 18 * 36 * 36
/**
 * @param {number} num
 * @param {number} downsample
 */
function encodeLocNum(num, downsample) {
	const numD = Math.round(num / downsample)
	if (numD < -LOC_NUM_ENC_OFFSET || numD >= LOC_NUM_ENC_OFFSET)
		throw new Error(`location value out of range: ${num} (${numD})`)
	const str = (LOC_NUM_ENC_OFFSET + numD).toString(36)
	return '0'.repeat(3 - str.length) + str
}
/**
 * @param {string} str
 * @param {number} i
 * @param {number} downsample
 */
function decodeLocNum(str, i, downsample) {
	return (parseInt(str.slice(i, i + 3), 36) - LOC_NUM_ENC_OFFSET) * downsample
}
