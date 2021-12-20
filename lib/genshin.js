/** @typedef {'pyro' | 'electro' | 'hydro' | 'dendro' | 'cryo' | 'anemo' | 'geo'} GI_ElementCode */
/** @typedef {'claymore' | 'sword' | 'catalyst' | 'polearm' | 'bow'} GI_WeaponTypeCode */
/** @typedef {3 | 4 | 5} GI_RarityCode */

/** @type {GI_ElementCode[]} */
export const GI_ELEMENT_CODES = ['pyro', 'electro', 'hydro', 'dendro', 'cryo', 'anemo', 'geo']

/** @type {GI_WeaponTypeCode[]} */
export const GI_WEAPON_TYPE_CODES = ['claymore', 'sword', 'catalyst', 'polearm', 'bow']

export const ART_GROUP_18_ATK_CODE = '18%-atk'
export const ART_GROUP_20_ER_CODE = '20%-er'

/** @type {GI_RarityCode[]} */
export const GI_RARITY_CODES = [3, 4, 5]

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
