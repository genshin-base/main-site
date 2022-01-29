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

/** @typedef {'teyvat'|'enkanomiya'} MapCode */
/** @typedef {{map:MapCode, x:number, y:number}} MapLocation */

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
	for (const [mapCode, letter] of Object.entries(locEnc_map2code)) {
		let xx = ''
		let yy = ''
		for (const { map, x, y } of sortedLocs) {
			if (map === mapCode) {
				xx += encodeLocNum(x, downsample)
				yy += encodeLocNum(y, downsample)
			}
		}
		if (xx || yy) res += xx + yy + letter
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
		.sort((a, b) => codes.indexOf(a.map) - codes.indexOf(b.map) || a.x - b.x || a.y - b.y)
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
					locs.push({ map: mapCode, x, y })
				}
			}
		}
		encodedLocations = encodedLocations.slice(i)
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
