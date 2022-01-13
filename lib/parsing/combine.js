import { warn } from '#lib/utils/logs.js'
import { getCharacterArtifactCodes, getCharacterWeaponCodes } from './helperteam/characters.js'

/**
 * @typedef {{
 *   code: string
 *   elementCode: import('#lib/genshin').GI_ElementCode,
 *   weaponTypeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 * }} CharacterShortInfo
 */

/**
 * @typedef {{
 *   character: import('./helperteam/characters').CharacterBuildInfo & {
 *     name: string,
 *     rarity: import('#lib/genshin').GI_RarityCode
 *   },
 *   artifacts: ArtifactFullInfo[],
 *   weapons: WeaponFullInfo[],
 * }} CharacterFullInfo
 */

/**
 * @typedef {{type:'domain', name:string, location:[x:number, y:number]}} DropSourceShortInfo
 */

/**
 * @typedef {import('./helperteam').ArtifactInfo & {
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   sources: DropSourceShortInfo[],
 *   recommendedTo: string[],
 * }} ArtifactFullInfo
 */

/**
 * @typedef {import('./helperteam').WeaponInfo & {
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   sources: DropSourceShortInfo[],
 * }} WeaponFullInfo
 */

/**
 * @param {import('./helperteam/characters').CharacterBuildInfo[]} buildCharacters
 * @param {import('#lib/parsing').Code2CharacterData} code2characterData
 * @returns {CharacterShortInfo[]}
 */
export function makeCharacterShortList(buildCharacters, code2characterData) {
	function getRarity(code) {
		const data = code2characterData[code]
		if (data) return data.rarity
		const def = 5
		warn(`can not find character '${code}' rarity, using '${def}'`)
		return def
	}
	return buildCharacters.map(x => ({
		code: x.code,
		elementCode: x.elementCode,
		weaponTypeCode: x.weaponTypeCode,
		rarity: getRarity(x.code),
	}))
}

/**
 * @param {import('./helperteam/characters').CharacterBuildInfo} character
 * @param {import('#lib/parsing').Code2CharacterData} code2characterData
 * @param {ArtifactFullInfo[]} artifacts
 * @param {WeaponFullInfo[]} weapons
 * @param {string} lang
 * @returns {CharacterFullInfo}
 */
export function makeCharacterFullInfo(character, code2characterData, artifacts, weapons, lang) {
	const weaponCodes = new Set(getCharacterWeaponCodes(character))
	const artifactCodes = new Set(getCharacterArtifactCodes(character))

	let name = character.code
	let rarity = /** @type {import('#lib/genshin').GI_RarityCode} */ (1)
	const data = code2characterData[character.code]
	if (data) {
		name = getLangValue(data.name, lang, character.code, 'name', character.code)
		rarity = data.rarity
	} else {
		warn(`can not get character full info: '${character.code}' not found`)
	}
	const characterExt = Object.assign({ name, rarity }, character)
	characterExt.roles = characterExt.roles.slice().sort((a, b) => +b.isRecommended - +a.isRecommended)

	return {
		character: characterExt,
		weapons: weapons.filter(x => weaponCodes.has(x.code)),
		artifacts: artifacts.filter(x => artifactCodes.has(x.code)),
	}
}

/**
 * @param {import('./helperteam').ArtifactInfo} artifact
 * @param {import('#lib/parsing').Code2ArtifactSetData} code2artifactData
 * @param {import('#lib/parsing').Code2DomainData} code2domainData
 * @param {import('./helperteam/characters').CharacterBuildInfo[]} characters
 * @param {string} lang
 * @returns {ArtifactFullInfo}
 */
export function makeArtifactFullInfo(artifact, code2artifactData, code2domainData, characters, lang) {
	let name = artifact.code
	let rarity = /** @type {import('#lib/genshin').GI_RarityCode} */ (5)
	const sources = /**@type {DropSourceShortInfo[]}*/ ([])

	const data = code2artifactData[artifact.code]
	if (data) {
		name = getLangValue(data.name, lang, artifact.code, 'name', artifact.code)
		rarity = data.rarity
	} else {
		warn(`artifact '${artifact.code}': full info not found, using default name and rarity`)
	}

	for (const domain of Object.values(code2domainData)) {
		if (domain.dropArtifactSetCodes.includes(artifact.code)) {
			const name = getLangValue(domain.name, lang, '', 'name', domain.code)
			sources.push({ type: 'domain', name, location: domain.location })
		}
	}

	const recommendedTo = []
	for (const character of characters)
		for (const code of getCharacterArtifactCodes(character))
			if (code === artifact.code) {
				recommendedTo.push(character.code)
				break
			}
	return Object.assign({ name, rarity, recommendedTo, sources }, artifact)
}

/**
 * @param {import('./helperteam').WeaponInfo} weapon
 * @param {import('#lib/parsing').Code2WeaponData} code2weaponData
 * @param {import('#lib/parsing').Code2DomainData} code2domainData
 * @param {string} lang
 * @returns {WeaponFullInfo}
 */
export function makeWeaponFullInfo(weapon, code2weaponData, code2domainData, lang) {
	let name = weapon.code
	let rarity = /** @type {import('#lib/genshin').GI_RarityCode} */ (5)
	const sources = /**@type {DropSourceShortInfo[]}*/ ([])

	const data = code2weaponData[weapon.code]
	if (data) {
		name = getLangValue(data.name, lang, weapon.code, 'name', weapon.code)
		rarity = data.rarity
	} else {
		warn(`weapon '${weapon.code}': full info not found, using default name and rarity`)
	}

	for (const domain of Object.values(code2domainData)) {
		if (domain.dropItemCodes.includes(weapon.code)) {
			const name = getLangValue(domain.name, lang, '', 'name', domain.code)
			sources.push({ type: 'domain', name, location: domain.location })
		}
	}
	return Object.assign({ name, rarity, sources }, weapon)
}

/**
 * @template T
 * @param {Record<string,T>} items
 * @param {string} lang
 * @param {T} defaultValue
 * @param {string} type
 * @param {string} objTitle
 * @returns {T}
 */
function getLangValue(items, lang, defaultValue, type, objTitle) {
	if (lang in items) {
		return items[lang]
	} else {
		warn(`can not find ${lang}-${type} for '${objTitle}', using default`)
		return defaultValue
	}
}
