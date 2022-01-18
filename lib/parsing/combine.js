import { arrPushIfNew } from '#lib/utils/collections.js'
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
 * @typedef {import('./helperteam/characters').CharacterBuildInfo & {
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   materialCodes: string[],
 * }} CharacterFullInfo
 */
/**
 * @typedef {{
 *   character: CharacterFullInfo,
 *   artifacts: ArtifactFullInfo[],
 *   weapons: WeaponFullInfo[],
 *   domains: DomainShortInfo[],
 *   enemies: EnemyShortInfo[],
 *   items: ItemShortInfo[],
 * }} CharacterFullInfoWithRelated
 */

/**
 * @typedef {import('./helperteam').ArtifactInfo & {
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   obtainSources: {domainCodes:string[], enemyCodes:string[]},
 *   recommendedTo: string[],
 * }} ArtifactFullInfo
 */
/**
 * @typedef {{
 *   artifacts: ArtifactFullInfo[],
 *   domains: DomainShortInfo[],
 *   enemies: EnemyShortInfo[],
 * }} ArtifactsFullInfoWithRelated
 */

/**
 * @typedef {import('./helperteam').WeaponInfo & {
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   obtainSources: import('#lib/genshin').GI_WeaponObtainSource[],
 *   materialCodes: string[],
 * }} WeaponFullInfo
 */
/**
 * @typedef {{
 *   weapons: WeaponFullInfo[],
 *   items: ItemShortInfo[],
 *   domains: DomainShortInfo[],
 * }} WeaponsFullInfoWithRelated
 */

/** @typedef {{code:string, name:string, location:[x:number, y:number]}} DomainShortInfo */
/** @typedef {{code:string, name:string, locations:[x:number, y:number][]}} EnemyShortInfo */
/** @typedef {{code:string, name:string, obtainSources:{domainCodes:string[], enemyCodes:string[]}}} ItemShortInfo */

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
 * @param {import('./helperteam/characters').CharacterBuildInfo} characterInfo
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {ArtifactFullInfo[]} artifacts
 * @param {WeaponFullInfo[]} weapons
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {string} lang
 * @returns {CharacterFullInfoWithRelated}
 */
export function makeCharacterFullInfo(
	characterInfo,
	code2character,
	artifacts,
	weapons,
	code2domain,
	code2enemy,
	code2item,
	lang,
) {
	const weaponCodes = new Set(getCharacterWeaponCodes(characterInfo))
	const artifactCodes = new Set(getCharacterArtifactCodes(characterInfo))

	const fullWeapons = weapons.filter(x => weaponCodes.has(x.code))
	const fullArtifacts = artifacts.filter(x => artifactCodes.has(x.code))
	const rels = {
		items: /**@type {Map<string, ItemShortInfo>}*/ (new Map()),
		domains: /**@type {Map<string, DomainShortInfo>}*/ (new Map()),
		enemies: /**@type {Map<string, EnemyShortInfo>}*/ (new Map()),
	}

	for (const weapon of fullWeapons)
		for (const code of weapon.materialCodes) {
			addItemWithRelated(rels, code, code2item, code2domain, code2enemy, lang)
		}

	for (const artifact of fullArtifacts) {
		const dCodes = addRelatedDomainsShortInfo(rels.domains, artifact.code, 'artifact', code2domain, lang)
		const eCodes = addRelatedEnemiesShortInfo(rels.enemies, artifact.code, 'artifact', code2enemy, lang)
		arrPushIfNew(artifact.obtainSources.domainCodes, ...dCodes)
		arrPushIfNew(artifact.obtainSources.enemyCodes, ...eCodes)
	}

	const data = code2character[characterInfo.code]
	if (!data) warn(`can not get character full info: '${characterInfo.code}' not found`)

	const name = data
		? getLangValue(data.name, lang, characterInfo.code, 'name', characterInfo.code)
		: characterInfo.code
	const rarity = data?.rarity ?? 1
	const materialCodes = data?.materialCodes ?? []

	for (const code of materialCodes) {
		addItemWithRelated(rels, code, code2item, code2domain, code2enemy, lang)
	}

	const characterExt = Object.assign({ name, rarity, materialCodes }, characterInfo)
	characterExt.roles = characterExt.roles.slice().sort((a, b) => +b.isRecommended - +a.isRecommended)

	return {
		character: characterExt,
		weapons: fullWeapons,
		artifacts: fullArtifacts,
		domains: Array.from(rels.domains.values()),
		enemies: Array.from(rels.enemies.values()),
		items: Array.from(rels.items.values()),
	}
}

/**
 * @param {import('./helperteam').ArtifactInfo[]} artifactInfos
 * @param {import('#lib/parsing').Code2ArtifactSetData} code2artifact
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('./helperteam/characters').CharacterBuildInfo[]} characters
 * @param {string} lang
 * @returns {ArtifactsFullInfoWithRelated}
 */
export function makeArtifactsFullInfo(
	artifactInfos,
	code2artifact,
	code2domain,
	code2enemy,
	characters,
	lang,
) {
	const fullArtifacts = artifactInfos.map(x =>
		makeArtifactFullInfo(x, code2artifact, code2domain, code2enemy, characters, lang),
	)
	const relDomains = /**@type {Map<string, DomainShortInfo>}*/ (new Map())
	const relEnemies = /**@type {Map<string, EnemyShortInfo>}*/ (new Map())

	for (const artifact of fullArtifacts) {
		const dCodes = addRelatedDomainsShortInfo(relDomains, artifact.code, 'artifact', code2domain, lang)
		const eCodes = addRelatedEnemiesShortInfo(relEnemies, artifact.code, 'artifact', code2enemy, lang)
		arrPushIfNew(artifact.obtainSources.domainCodes, ...dCodes)
		arrPushIfNew(artifact.obtainSources.enemyCodes, ...eCodes)
	}

	return {
		artifacts: fullArtifacts,
		domains: Array.from(relDomains.values()),
		enemies: Array.from(relEnemies.values()),
	}
}

/**
 * @param {import('./helperteam').WeaponInfo[]} weaponInfos
 * @param {import('#lib/parsing').Code2WeaponData} code2weapon
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {string} lang
 * @returns {WeaponsFullInfoWithRelated}
 */
export function makeWeaponsFullInfo(weaponInfos, code2weapon, code2domain, code2item, lang) {
	const fullWeapons = weaponInfos.map(x => makeWeaponFullInfo(x, code2weapon, lang))
	const rels = {
		items: /**@type {Map<string, ItemShortInfo>}*/ (new Map()),
		domains: /**@type {Map<string, DomainShortInfo>}*/ (new Map()),
	}

	for (const weapon of fullWeapons)
		for (const code of weapon.materialCodes) {
			// дропа оружия с врагов пока нет, используем заглушку
			const code2enemy = /**@type {import('#lib/parsing').Code2EnemyData}*/ ({})
			addItemWithRelated(rels, code, code2item, code2domain, code2enemy, lang)
		}

	return {
		weapons: fullWeapons,
		items: Array.from(rels.items.values()),
		domains: Array.from(rels.domains.values()),
	}
}

/**
 * @param {import('./helperteam').ArtifactInfo} artifact
 * @param {import('#lib/parsing').Code2ArtifactSetData} code2artifact
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('./helperteam/characters').CharacterBuildInfo[]} charactersInfo
 * @param {string} lang
 * @returns {ArtifactFullInfo}
 */
function makeArtifactFullInfo(artifact, code2artifact, code2domain, code2enemy, charactersInfo, lang) {
	const data = /**@type {import('#lib/parsing').ArtifactSetData|undefined}*/ (code2artifact[artifact.code])
	if (!data) warn(`artifact '${artifact.code}': full info not found, using default name and rarity`)

	const name = data ? getLangValue(data.name, lang, artifact.code, 'name', artifact.code) : artifact.code
	const rarity = data?.rarity ?? 5
	/** @type {ArtifactFullInfo["obtainSources"]} */
	const obtainSources = { domainCodes: [], enemyCodes: [] }
	const recommendedTo = []

	for (const domain of Object.values(code2domain))
		if (domain.drop.artifactSetCodes.includes(artifact.code)) {
			obtainSources.domainCodes.push(domain.code)
		}

	for (const enemy of Object.values(code2enemy))
		if (enemy.drop.artifactSetCodes.includes(artifact.code)) {
			obtainSources.enemyCodes.push(enemy.code)
		}

	for (const character of charactersInfo)
		for (const code of getCharacterArtifactCodes(character))
			if (code === artifact.code) {
				recommendedTo.push(character.code)
				break
			}
	return Object.assign({ name, rarity, recommendedTo, obtainSources }, artifact)
}

/**
 * @param {import('./helperteam').WeaponInfo} weapon
 * @param {import('#lib/parsing').Code2WeaponData} code2weaponData
 * @param {string} lang
 * @returns {WeaponFullInfo}
 */
function makeWeaponFullInfo(weapon, code2weaponData, lang) {
	const data = /**@type {import('#lib/parsing').WeaponData|undefined}*/ (code2weaponData[weapon.code])
	if (!data) warn(`weapon '${weapon.code}': full info not found, using default name and rarity`)

	const name = data ? getLangValue(data.name, lang, weapon.code, 'name', weapon.code) : weapon.code
	const rarity = data ? data.rarity : 5
	const obtainSources = data?.obtainSources ?? []
	const materialCodes = data?.materialCodes ?? []

	return Object.assign({ name, rarity, obtainSources, materialCodes }, weapon)
}

/**
 * @param {Map<string,DomainShortInfo>} relDomains
 * @param {string} objCode
 * @param {'item'|'artifact'} objType
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {string} lang
 * @returns {string[]}
 */
function addRelatedDomainsShortInfo(relDomains, objCode, objType, code2domain, lang) {
	const domainCodes = []
	for (const domain of Object.values(code2domain)) {
		const codes = objType === 'item' ? domain.drop.itemCodes : domain.drop.artifactSetCodes
		if (codes.includes(objCode)) {
			if (!relDomains.has(domain.code)) {
				const name = getLangValue(domain.name, lang, '', 'name', domain.code)
				relDomains.set(domain.code, { code: domain.code, name, location: domain.location })
			}
			domainCodes.push(domain.code)
		}
	}
	return domainCodes
}

/**
 * @param {Map<string,EnemyShortInfo>} relEnemies
 * @param {string} objCode
 * @param {'item'|'artifact'} objType
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {string} lang
 * @returns {string[]}
 */
function addRelatedEnemiesShortInfo(relEnemies, objCode, objType, code2enemy, lang) {
	const enemyCodes = []
	for (const enemy of Object.values(code2enemy)) {
		const codes = objType === 'item' ? enemy.drop.itemCodes : enemy.drop.artifactSetCodes
		if (codes.includes(objCode)) {
			if (!relEnemies.has(enemy.code)) {
				const name = getLangValue(enemy.name, lang, '', 'name', enemy.code)
				relEnemies.set(enemy.code, { code: enemy.code, name, locations: enemy.locations })
			}
			enemyCodes.push(enemy.code)
		}
	}
	return enemyCodes
}

/**
 * @param {string} code
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {{domainCodes:string[], enemyCodes:string[]}} obtainSources
 * @param {string} lang
 * @returns {ItemShortInfo}
 */
function makeItemShortInfo(code, code2item, obtainSources, lang) {
	const item = code2item[code]
	if (!item) warn(`unknown item '${code}'`)
	const name = item ? getLangValue(item.name, lang, '', 'name', code) : code
	return { code, name, obtainSources }
}

/**
 * @param {{
 *   items: Map<string,ItemShortInfo>,
 *   domains?: Map<string,DomainShortInfo>,
 *   enemies?: Map<string,EnemyShortInfo>,
 * }} rels
 * @param {string} itemCode
 * @param {import('#lib/parsing').Code2ItemData } code2item
 * @param {import('#lib/parsing').Code2DomainData } code2domain
 * @param {import('#lib/parsing').Code2EnemyData } code2enemy
 * @param {string} lang
 */
function addItemWithRelated(rels, itemCode, code2item, code2domain, code2enemy, lang) {
	if (rels.items.has(itemCode)) return
	const domainCodes = rels.domains
		? addRelatedDomainsShortInfo(rels.domains, itemCode, 'item', code2domain, lang)
		: []
	const enemyCodes = rels.enemies
		? addRelatedEnemiesShortInfo(rels.enemies, itemCode, 'item', code2enemy, lang)
		: []
	rels.items.set(itemCode, makeItemShortInfo(itemCode, code2item, { domainCodes, enemyCodes }, lang))
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
