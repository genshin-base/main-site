import { setDayStartUTC, weekdayAsMonSun } from './utils/date.js'

/** @typedef {'pyro' | 'electro' | 'hydro' | 'dendro' | 'cryo' | 'anemo' | 'geo'} GI_ElementCode */
/** @typedef {'claymore' | 'sword' | 'catalyst' | 'polearm' | 'bow'} GI_WeaponTypeCode */
/** @typedef {'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'} GI_ArtifactTypeCode */
/** @typedef {1 | 2 | 3 | 4 | 5} GI_RarityCode */
/**
 * @typedef {'wishes'|'event-wishes'|'events'|'battle-pass'|'in-game-shop'|
 *   'forging'|'fishing'|'npc-shop'|'chests'|'quests'|'puzzles'|'investigation'|
 *   'adventure-rank-10'|'playstation'} GI_WeaponObtainSource
 */
/** @typedef {'limited'|'unlimited'} GI_DomainTypeCode */

/** @typedef {{mapCode:MapCode, x:number, y:number}} MapLocation */

/** @typedef {'teyvat'|'enkanomiya'|'chasm'} MapCode */
/** @type {MapCode[]} */
export const GI_MAP_CODES = ['teyvat', 'enkanomiya', 'chasm']

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
export const ART_GROUP_20_ER_CODE = '20%-er'
/** @typedef {'18%-atk'|'20%-er'} GI_ArtifactGroupCode */
/** @type {GI_ArtifactGroupCode[]} */
export const GI_ARTIFACT_GROUP_CODES = [ART_GROUP_18_ATK_CODE, ART_GROUP_20_ER_CODE]

/** @type {GI_RarityCode[]} */
export const GI_RARITY_CODES = [1, 2, 3, 4, 5]

/** Обычные коды, используются как есть */
const _GI_STAT_REGULAR = /**@type {const}*/ (['em'])
/** Используется как в обычном виде, так и с процентами: <stat> и <stat>% */
const _GI_STAT_PERCENT = /**@type {const}*/ (['def', 'dmg', 'atk', 'hp', 'er', 'healing'])
/** Используются с префиксом 'crit-' */
const _GI_STAT_CRIT_SUFFIXES = /**@type {const}*/ (['rate', 'dmg', 'rate%', 'dmg%'])
/** Используются с суффиксами '-dmg' и '-dmg%' */
const _GI_STAT_DMG_PEFIXES = /**@type {const}*/ (['phys', 'cryo', 'geo', 'anemo', 'hydro', 'electro', 'pyro'])

/**
 * @typedef {typeof _GI_STAT_REGULAR[number]
 *   | typeof _GI_STAT_PERCENT[number]
 *   | `${typeof _GI_STAT_PERCENT[number]}%`
 *   | `crit-${typeof _GI_STAT_CRIT_SUFFIXES[number]}`
 *   | `${typeof _GI_STAT_DMG_PEFIXES[number]}-dmg`
 *   | `${typeof _GI_STAT_DMG_PEFIXES[number]}-dmg%`} GI_KnownStatBonusCode
 */

export const GI_KNOWN_STAT_BONUS_CODES = /**@type {GI_KnownStatBonusCode[]}*/ (
	/**@type {readonly string[]}*/ (_GI_STAT_REGULAR)
		.concat(_GI_STAT_PERCENT)
		.concat(_GI_STAT_PERCENT.map(x => x + '%'))
		.concat(_GI_STAT_CRIT_SUFFIXES.map(x => 'crit-' + x))
		.concat(_GI_STAT_DMG_PEFIXES.map(x => x + '-dmg'))
		.concat(_GI_STAT_DMG_PEFIXES.map(x => x + '-dmg%'))
)

/**
 * Сдвиг таймзоны региона относительно UTC (в часах)
 * @type {Record<GI_ServerRegionCode, number>}
 */
export const GI_REGION_TIMEZONE_OFFSET = {
	europe: 1,
	asia: 8,
	'north-america': -5,
}
/** Время перезапуска сервера (в часах) относительно полуночи по локальному времени региона */
export const GI_SERVER_RESET_TIME = 4
/**
 * @param {GI_ServerRegionCode} regionCode
 * @returns {{weekdayCode:WeekdayCode, weekdayMonSun:number, resetIn:number, resetAt:Date}}
 */
export function getRegionTime(regionCode) {
	const now = new Date()
	// время до перезапуска сервера относительно конца дня по UTC
	const offsetHours = GI_SERVER_RESET_TIME - GI_REGION_TIMEZONE_OFFSET[regionCode]

	const lastResetDate = new Date(now)
	lastResetDate.setHours(lastResetDate.getHours() - offsetHours)
	const weekdayMonSun = weekdayAsMonSun(lastResetDate.getUTCDay())
	setDayStartUTC(lastResetDate)
	lastResetDate.setUTCHours(offsetHours)

	const nextResetDate = new Date(lastResetDate)
	nextResetDate.setDate(nextResetDate.getDate() + 1)

	return {
		weekdayMonSun: weekdayMonSun,
		weekdayCode: GI_ROTATION_WEEKDAY_CODES[weekdayMonSun],
		resetIn: +nextResetDate - +now,
		resetAt: nextResetDate,
	}
}
/**
 * {@link https://www.timeanddate.com/time/map/}
 * @returns {GI_ServerRegionCode}
 */
export function guessCurrentRegion() {
	if (navigator.language.startsWith('ru')) return 'europe'
	const curOffset = -new Date().getTimezoneOffset() / 60
	if (curOffset <= -2) return 'north-america'
	if (curOffset >= 5) return 'asia'
	return 'europe'
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
	chasm: 'C',
}
/** @type {Record<string, MapCode>} */
const locEnc_code2map = {
	T: 'teyvat',
	E: 'enkanomiya',
	C: 'chasm',
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
