import { encodeObjLocations, encodeLocationsChecked, GI_ROTATION_WEEKDAY_CODES } from '#lib/genshin.js'
import { arrPushIfNew } from '#lib/utils/collections.js'
import { warn } from '#lib/utils/logs.js'
import { getCharacterArtifactCodes, getCharacterWeaponCodes } from './helperteam/characters.js'
import { buildCharacterConvertLangMode } from './helperteam/build_texts.js'
import { getItemAncestryCodes } from './honeyhunter/items.js'
import { sortCharacters, sortCharacterCodes, sortDomainItems, sortCharacterMaterialItems } from './sorting.js'

/**
 * @typedef {{
 *   code: string
 *   elementCode: import('#lib/genshin').GI_ElementCode,
 *   weaponTypeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 * }} CharacterShortInfo
 */

/**
 * @typedef {import('./helperteam/types').CharacterBuildInfo<'monolang'> & {
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   materialCodes: string[],
 * }} CharacterFullInfo
 */
/**
 * @typedef {{
 *   character: CharacterFullInfo,
 *   artifacts: ArtifactRegularInfo[],
 *   weapons: WeaponRegularInfo[],
 *   domains: DomainShortInfo[],
 *   enemies: EnemyShortInfo[],
 *   items: ItemShortInfo[],
 * }} CharacterFullInfoWithRelated
 */

/**
 * @typedef {Record<'items'|'enemies', Record<string,string>>} ExtractedLocationsInfo
 */

/**
 * @typedef {{
 *   code: string,
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   sets: {
 *     '1': string,
 *   } | {
 *     '2': string,
 *     '4': string,
 *   },
 *   obtainSources: {domainCodes:string[], enemyCodes:string[]},
 *   recommendedTo: string[],
 * }} ArtifactRegularInfo
 */

/**
 * @typedef {ArtifactRegularInfo & {
 *   pieces: Partial<Record<import("#lib/genshin").GI_ArtifactTypeCode, {
 *     description: string,
 *     story: import("./helperteam/text").CompactTextParagraphs,
 *   }>>
 * }} ArtifactFullInfo
 */
/**
 * @typedef {{
 *   artifact: ArtifactFullInfo,
 *   domains: DomainShortInfo[],
 *   enemies: EnemyShortInfo[],
 * }} ArtifactFullInfoWithRelated
 */

/**
 * @typedef {{
 *   code: string,
 *   name: string,
 *   typeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   atk: {base:number, max:number},
 *   subStat: {code:string, base:number, max:number} | null,
 *   passiveStat: string,
 *   obtainSources: import('#lib/genshin').GI_WeaponObtainSource[],
 *   materialCodes: string[],
 *   recommendedTo: string[],
 * }} WeaponRegularInfo
 */

/**
 * @typedef {WeaponRegularInfo & {
 *   description: string,
 *   story: import('./helperteam/text').CompactTextParagraphs,
 * }} WeaponFullInfo
 */
/**
 * @typedef {{
 *   weapon: WeaponFullInfo,
 *   items: ItemShortInfo[],
 *   enemies: EnemyShortInfo[],
 *   domains: DomainShortInfo[],
 * }} WeaponFullInfoWithRelated
 */

/**
 * @typedef {{
 *   code: string,
 *   name: string,
 *   type: import('#lib/genshin').GI_DomainTypeCode,
 *   location: import('#lib/genshin').MapLocation,
 * }} DomainShortInfo
 */

/**
 * @typedef {{
 *   code: string,
 *   name: string,
 *   locations: "external" | import('#lib/genshin').MapLocation[],
 *   _locsEnc?: string|null,
 * }} EnemyShortInfo
 */

/**
 * @typedef {{
 *   code: string,
 *   name: string,
 *   types: import('#lib/parsing').ItemType[],
 *   obtainSources: {domainCodes:string[], enemyCodes:string[]},
 *   ancestryCodes: string[],
 *   locations: "external" | import('#lib/genshin').MapLocation[],
 *   _locsEnc?: string|null,
 * }} ItemShortInfo
 */

/**
 * @typedef {{
 *   characterAscensions: {
 *     itemCode: string,
 *     characterCodes: string[],
 *   }[],
 *   weaponMaterialCodes: string[],
 * }} MaterialsTimetableItem
 */
/**
 * @typedef {{
 *   timetable: Record<import("#lib/genshin").WeekdayCode, MaterialsTimetableItem>
 *   domains: DomainShortInfo[],
 *   enemies: EnemyShortInfo[],
 *   items: ItemShortInfo[],
 * }} MaterialsTimetableWithRelated
 */

/**
 * @param {import('./helperteam/types').CharacterBuildInfo<unknown>[]} buildCharacters
 * @param {import('#lib/parsing').Code2CharacterData} code2characterData
 * @returns {CharacterShortInfo[]}
 */
export function makeCharacterShortList(buildCharacters, code2characterData) {
	return sortCharacters(
		buildCharacters.map(x => {
			const data = code2characterData[x.code]
			const rarity = data ? data.rarity : 5
			const weaponTypeCode = data ? data.weaponTypeCode : 'claymore'
			if (!data) warn(`can not find character '${x.code}' data, using default rarity and weapon`)
			return {
				code: x.code,
				elementCode: x.elementCode,
				weaponTypeCode,
				rarity,
			}
		}),
		char => char.code,
		code2characterData,
	)
}

/**
 * @param {import('./helperteam/types').CharacterBuildInfo<'multilang'>} characterInfo
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {ArtifactRegularInfo[]} artifacts
 * @param {WeaponRegularInfo[]} weapons
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {import('#lib/parsing').ArtifcatSetGroupsCodes} artGroupCodes
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
	artGroupCodes,
	lang,
) {
	const characterLang = buildCharacterConvertLangMode(characterInfo, 'monolang', vals =>
		getLangValueUnlessBlank(vals, lang, null, 'attr', `${characterInfo.code}`),
	)
	characterLang.roles.sort((a, b) => +b.isRecommended - +a.isRecommended || a.code.localeCompare(b.code))

	const weaponCodes = new Set(getCharacterWeaponCodes(characterLang))
	const artifactCodes = new Set(getCharacterArtifactCodes(characterLang, artGroupCodes))

	const weaponInfos = weapons.filter(x => weaponCodes.has(x.code))
	const artifactInfos = artifacts.filter(x => artifactCodes.has(x.code))
	const rels = {
		items: /**@type {Map<string, ItemShortInfo>}*/ (new Map()),
		domains: /**@type {Map<string, DomainShortInfo>}*/ (new Map()),
		enemies: /**@type {Map<string, EnemyShortInfo>}*/ (new Map()),
	}

	for (const weapon of weaponInfos)
		for (const code of weapon.materialCodes) {
			addItemWithRelated(rels, code, code2item, code2domain, code2enemy, lang)
		}

	for (const artifact of artifactInfos) {
		const dCodes = addRelatedDomainsShortInfo(rels.domains, artifact.code, 'artifact', code2domain, lang)
		const eCodes = addRelatedEnemiesShortInfo(rels.enemies, artifact.code, 'artifact', code2enemy, lang)
		arrPushIfNew(artifact.obtainSources.domainCodes, ...dCodes)
		arrPushIfNew(artifact.obtainSources.enemyCodes, ...eCodes)
	}

	const data = code2character[characterInfo.code]
	if (!data) warn(`character '${characterInfo.code}': can not get full info, using defaults`)

	const name = data
		? getLangValue(data.name, lang, characterInfo.code, 'name', characterInfo.code)
		: characterInfo.code
	const rarity = data?.rarity ?? 1
	const materialCodes = data?.materialCodes ?? []

	sortCharacterMaterialItems(materialCodes, code => code, code2item, code2domain)
	for (const code of materialCodes) {
		addItemWithRelated(rels, code, code2item, code2domain, code2enemy, lang)
	}

	const characterExt = /** @type {CharacterFullInfo} */ ({
		code: characterInfo.code,
		elementCode: characterInfo.elementCode,
		name,
		rarity,
		materialCodes,
		roles: characterLang.roles,
		credits: characterLang.credits,
	})

	return {
		character: characterExt,
		weapons: weaponInfos,
		artifacts: artifactInfos,
		domains: Array.from(rels.domains.values()),
		enemies: Array.from(rels.enemies.values()),
		items: Array.from(rels.items.values()),
	}
}

/**
 * @param {import("#lib/parsing/combine").CharacterFullInfoWithRelated} fullInfo
 * @returns {import("#lib/parsing/combine").ExtractedLocationsInfo}
 */
export function extractFullInfoLocations(fullInfo) {
	return {
		items: extractItemsLocations(fullInfo.items),
		enemies: extractItemsLocations(fullInfo.enemies),
	}
}
/**
 * @param {(import("#lib/parsing/combine").ItemShortInfo|import("#lib/parsing/combine").EnemyShortInfo)[]} items
 * @returns {Record<string,string>}
 */
function extractItemsLocations(items) {
	const code2locs = /**@type {Record<string,string>}*/ ({})
	for (const item of items) {
		if (item.locations.length > 3 && item.locations !== 'external') {
			code2locs[item.code] = encodeLocationsChecked(item.locations, 2)
			item.locations = 'external'
		}
	}
	return code2locs
}

/**
 * @param {import('#lib/parsing').Code2ArtifactSetData} code2artifact
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {Map<string, string[]>} recomArt2characters
 * @param {string} lang
 * @returns {ArtifactRegularInfo[]}
 */
export function makeArtifactsRegularInfo(
	code2artifact,
	code2character,
	code2domain,
	code2enemy,
	recomArt2characters,
	lang,
) {
	return Object.values(code2artifact).map(x =>
		makeArtifactRegularInfo(x, code2character, code2domain, code2enemy, recomArt2characters, lang),
	)
}
/**
 * @param {import('#lib/parsing').ArtifactSetData} artifact
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {Map<string, string[]>} recomArt2characters
 * @param {string} lang
 * @returns {ArtifactFullInfoWithRelated}
 */
export function makeArtifactFullInfoWithRelated(
	artifact,
	code2character,
	code2domain,
	code2enemy,
	recomArt2characters,
	lang,
) {
	const artifactInfo = makeArtifactFullInfo(
		artifact,
		code2character,
		code2domain,
		code2enemy,
		recomArt2characters,
		lang,
	)
	const relDomains = /**@type {Map<string, DomainShortInfo>}*/ (new Map())
	const relEnemies = /**@type {Map<string, EnemyShortInfo>}*/ (new Map())

	const dCodes = addRelatedDomainsShortInfo(relDomains, artifact.code, 'artifact', code2domain, lang)
	const eCodes = addRelatedEnemiesShortInfo(relEnemies, artifact.code, 'artifact', code2enemy, lang)
	arrPushIfNew(artifactInfo.obtainSources.domainCodes, ...dCodes)
	arrPushIfNew(artifactInfo.obtainSources.enemyCodes, ...eCodes)

	for (const enemy of relEnemies.values()) encodeObjLocations(enemy, 1)

	return {
		artifact: artifactInfo,
		domains: Array.from(relDomains.values()),
		enemies: Array.from(relEnemies.values()),
	}
}

/**
 * @param {import('#lib/parsing').Code2WeaponData} code2weapon
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {Map<string, string[]>} recommendedWeaponCode2charCodes
 * @param {string} lang
 * @returns {WeaponRegularInfo[]}
 */
export function makeWeaponsRegularInfo(code2weapon, code2character, recommendedWeaponCode2charCodes, lang) {
	return Object.values(code2weapon).map(x =>
		makeWeaponRegularInfo(x, recommendedWeaponCode2charCodes, code2character, lang),
	)
}
/**
 * @param {import('#lib/parsing').WeaponData} weapon
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {Map<string, string[]>} recommendedWeaponCode2charCodes
 * @param {string} lang
 * @returns {WeaponFullInfoWithRelated}
 */
export function makeWeaponFullInfoWithRelated(
	weapon,
	code2character,
	code2domain,
	code2enemy,
	code2item,
	recommendedWeaponCode2charCodes,
	lang,
) {
	const weaponInfo = makeWeaponFullInfo(weapon, recommendedWeaponCode2charCodes, code2character, lang)
	const rels = {
		items: /**@type {Map<string, ItemShortInfo>}*/ (new Map()),
		domains: /**@type {Map<string, DomainShortInfo>}*/ (new Map()),
		enemies: /**@type {Map<string, EnemyShortInfo>}*/ (new Map()),
	}
	for (const code of weapon.materialCodes) {
		addItemWithRelated(rels, code, code2item, code2domain, code2enemy, lang)
	}

	for (const enemy of rels.enemies.values()) encodeObjLocations(enemy, 1)
	for (const item of rels.items.values()) encodeObjLocations(item, 1)

	return {
		weapon: weaponInfo,
		items: Array.from(rels.items.values()),
		domains: Array.from(rels.domains.values()),
		enemies: Array.from(rels.enemies.values()),
	}
}

/**
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 */
export function excludeDomainBosses(code2enemy, code2domain) {
	const excludeCodes = new Set()
	for (const code in code2domain) excludeCodes.add(code2domain[code].bossCode)
	for (const code in code2enemy) if (excludeCodes.has(code)) delete code2enemy[code]
}

/**
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2WeaponData} code2weapon
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {string} lang
 * @returns {MaterialsTimetableWithRelated}
 */
export function makeMaterialsTimetable(
	code2character,
	code2domain,
	code2weapon,
	code2enemy,
	code2item,
	lang,
) {
	/** @type {Partial<Record<import('#lib/genshin.js').WeekdayCode, MaterialsTimetableItem>>} */
	const timetable = {}

	const domains = /**@type {Map<string, DomainShortInfo>}*/ (new Map())
	const enemies = /**@type {Map<string, EnemyShortInfo>}*/ (new Map())
	const items = /**@type {Map<string, ItemShortInfo>}*/ (new Map())

	for (const weekday of GI_ROTATION_WEEKDAY_CODES) {
		/** @type {MaterialsTimetableItem} */
		const dayTimetable = (timetable[weekday] = {
			characterAscensions: [],
			weaponMaterialCodes: [],
		})

		for (const domain of Object.values(code2domain)) {
			const itemCodes = domain.dropTimetable[weekday]?.itemCodes ?? []
			for (const itemCode of itemCodes) {
				const characterCodes = /**@type {Set<string>}*/ (new Set())
				let usedForWeapon = false

				for (const character of Object.values(code2character)) {
					if (character.materialCodes.includes(itemCode)) {
						characterCodes.add(character.code)
					}
				}
				for (const weapon of Object.values(code2weapon)) {
					if (weapon.materialCodes.includes(itemCode)) {
						usedForWeapon = true
						break
					}
				}

				if (characterCodes.size > 0 || usedForWeapon) {
					const rels = { items, domains, enemies }
					addItemWithRelated(rels, itemCode, code2item, code2domain, code2enemy, lang)

					if (characterCodes.size > 0)
						dayTimetable.characterAscensions.push({
							itemCode,
							characterCodes: sortCharacterCodes([...characterCodes], code2character),
						})

					if (usedForWeapon) dayTimetable.weaponMaterialCodes.push(itemCode)
				}
			}
		}

		sortDomainItems(dayTimetable.characterAscensions, x => x.itemCode, code2domain).reverse()
		sortDomainItems(dayTimetable.weaponMaterialCodes, code => code, code2domain).reverse()
	}

	return /**@type {MaterialsTimetableWithRelated}*/ {
		timetable: /** @type {Record<import('#lib/genshin.js').WeekdayCode, MaterialsTimetableItem>} */ (
			timetable
		),
		domains: [...domains.values()].sort((a, b) => a.code.localeCompare(b.code)),
		enemies: [...enemies.values()].sort((a, b) => a.code.localeCompare(b.code)),
		items: sortDomainItems([...items.values()], item => item.code, code2domain).reverse(),
	}
}

/**
 * @param {import('#lib/parsing').ArtifactSetData} artifact
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {Map<string, string[]>} recommendedArtCode2charCodes
 * @param {string} lang
 * @returns {ArtifactRegularInfo}
 */
function makeArtifactRegularInfo(
	artifact,
	code2character,
	code2domain,
	code2enemy,
	recommendedArtCode2charCodes,
	lang,
) {
	const name = getLangValue(artifact.name, lang, artifact.code, 'name', artifact.code)
	const rarity = artifact.rarity
	/** @type {ArtifactRegularInfo["obtainSources"]} */
	const obtainSources = { domainCodes: [], enemyCodes: [] }
	const recommendedTo = (recommendedArtCode2charCodes.get(artifact.code) ?? []).slice()

	for (const domain of Object.values(code2domain))
		if (domain.drop.artifactSetCodes.includes(artifact.code)) {
			obtainSources.domainCodes.push(domain.code)
		}

	for (const enemy of Object.values(code2enemy))
		if (enemy.drop.artifactSetCodes.includes(artifact.code)) {
			obtainSources.enemyCodes.push(enemy.code)
		}

	sortCharacterCodes(recommendedTo, code2character)

	const sets =
		'1' in artifact.sets
			? { 1: getLangValue(artifact.sets[1], lang, '', 'set-x1', 'artifact') }
			: {
					2: getLangValue(artifact.sets[2], lang, '', 'set-x2', 'artifact'),
					4: getLangValue(artifact.sets[4], lang, '', 'set-x4', 'artifact'),
			  }

	return { code: artifact.code, name, rarity, recommendedTo, obtainSources, sets }
}
/**
 * @param {import('#lib/parsing').ArtifactSetData} artifact
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {Map<string, string[]>} recommendedArtCode2charCodes
 * @param {string} lang
 * @returns {ArtifactFullInfo}
 */
function makeArtifactFullInfo(
	artifact,
	code2character,
	code2domain,
	code2enemy,
	recommendedArtCode2charCodes,
	lang,
) {
	const regular = makeArtifactRegularInfo(
		artifact,
		code2character,
		code2domain,
		code2enemy,
		recommendedArtCode2charCodes,
		lang,
	)
	const pieces = Object.fromEntries(
		Object.entries(artifact.pieces).map(([type, piece]) => [
			type,
			{
				description: getLangValue(piece.description, lang, '', `${type}-descr`, 'artifact'),
				story: getLangValue(piece.story, lang, '', `${type}-story`, 'artifact'),
			},
		]),
	)
	return Object.assign(regular, { pieces })
}

/**
 * @param {import('#lib/parsing').WeaponData} weapon
 * @param {Map<string, string[]>} recommendedWeaponCode2charCodes
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {string} lang
 * @returns {WeaponRegularInfo}
 */
function makeWeaponRegularInfo(weapon, recommendedWeaponCode2charCodes, code2character, lang) {
	const recommendedTo = (recommendedWeaponCode2charCodes.get(weapon.code) ?? []).slice()

	sortCharacterCodes(recommendedTo, code2character)

	return {
		code: weapon.code,
		typeCode: weapon.typeCode,
		name: getLangValue(weapon.name, lang, weapon.code, 'name', weapon.code),
		rarity: weapon.rarity,
		obtainSources: weapon.obtainSources,
		materialCodes: weapon.materialCodes,
		recommendedTo,
		atk: weapon.atk,
		subStat: weapon.subStat,
		passiveStat: getLangValue(weapon.specialAbility, lang, '', 'special-ability', 'weapon'),
	}
}
/**
 * @param {import('#lib/parsing').WeaponData} weapon
 * @param {Map<string, string[]>} recommendedWeaponCode2charCodes
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @param {string} lang
 * @returns {WeaponFullInfo}
 */
function makeWeaponFullInfo(weapon, recommendedWeaponCode2charCodes, code2character, lang) {
	const regular = makeWeaponRegularInfo(weapon, recommendedWeaponCode2charCodes, code2character, lang)
	return Object.assign(regular, {
		description: getLangValue(weapon.description, lang, '', 'description', 'weapon'),
		story: getLangValue(weapon.story, lang, '', 'story', 'weapon'),
	})
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
				const type = domain.bossCode ? 'limited' : 'unlimited'
				relDomains.set(domain.code, { code: domain.code, name, type, location: domain.location })
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
	const item = /**@type {import('#lib/parsing').ItemData|undefined}*/ (code2item[code])
	if (!item) warn(`unknown item '${code}', using defaults`)

	const name = item ? getLangValue(item.name, lang, '', 'name', code) : code
	const types = item ? item.types : []
	const locations = item?.locations ?? []

	const ancestryCodes = getItemAncestryCodes(item, code2item)
	return { code, name, types, obtainSources, ancestryCodes, locations }
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
/**
 * @template T
 * @param {Record<string,T>} items
 * @param {string} lang
 * @param {T} defaultValue
 * @param {string} type
 * @param {string} objTitle
 * @returns {T|null}
 */
function getLangValueUnlessBlank(items, lang, defaultValue, type, objTitle) {
	if (Object.keys(items).length === 0) return null
	return getLangValue(items, lang, defaultValue, type, objTitle)
}
