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
	let code = name.trim().toLocaleLowerCase().replace(/\s/g, '-')
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
 * @param {[x:number, y:number][]} locations
 * @param {number} [downsample]
 * @returns {string}
 */
export function encodeLocations(locations, downsample = 1) {
	if (downsample < 1 || downsample > 35 || downsample % 1 !== 0)
		throw new Error(`wrong downsample: ${downsample}`)

	let xx = ''
	let yy = ''
	for (const [x, y] of locations) {
		xx += encodeLocNum(x, downsample)
		yy += encodeLocNum(y, downsample)
	}
	return downsample.toString(36) + xx + yy
}
/**
 * @param {string} encodedLocations
 * @returns {[x:number, y:number][]}
 */
export function decodeLocations(encodedLocations) {
	const downsample = parseInt(encodedLocations[0], 36)
	const len = ((encodedLocations.length - 1) / 6) | 0
	const locs = /**@type {[x:number, y:number][]}*/ ([])
	for (let i = 0; i < len; i++) {
		const x = decodeLocNum(encodedLocations, 1 + i * 3, downsample)
		const y = decodeLocNum(encodedLocations, 1 + (i + len) * 3, downsample)
		locs.push([x, y])
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
