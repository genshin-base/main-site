import { getCharacterCodeFromName, getWithMaxRarity } from '#lib/genshin.js'
import { tryWithContext } from '#lib/utils/logs.js'
import {
	mustFindNodeAttrMatch,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	searchNodeWithTag,
} from '#lib/xml.js'
import { sortCharacterMaterialItems } from '#lib/parsing/sorting.js'
import {
	addLangItem,
	checkedElementCode,
	checkedWeaponTypeCode,
	ensureSame,
	getHoneyPage,
	makeLangMap,
	mustCountRarityStars,
	mustGetIdAndName,
	mustParseJSTableHeder,
	mustParsesJSTableScriptRows,
} from './common.js'
import { groupItemsByCraft } from './items.js'
import { mustBeDefined } from '#lib/utils/values.js'
import { applyItemsPostFixes } from './fixes.js'

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   elementCode: import('#lib/genshin').GI_ElementCode,
 *   weaponTypeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   materialCodes: string[],
 * }} CharacterLang
 */

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{code2item:import('#lib/parsing').Code2CharacterData}>}
 */
export async function extractCharactersData(cacheDir, langs, id2item, fixes) {
	const itemCode2craftGroup = groupItemsByCraft(Array.from(id2item.values()))
	function withMaxRarityInGroup(item) {
		return getWithMaxRarity(mustBeDefined(itemCode2craftGroup.get(item.code)))
	}

	const id2characterLang = /**@type {import('./common').IdLangMap<CharacterLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('fam_chars', cacheDir, lang)
		tryWithContext('honeyhunter: characters', 'skipping', null, setLogPrefix => {
			const foundSection = searchNodeWithTag(root, 'section', node => node.attrs.id === 'characters')
			if (!foundSection) throw new Error('characters section not found')
			const foundTable = mustFindNodeByClass(foundSection.node, 'genshin_table')
			const header = mustParseJSTableHeder(foundTable)
			const rows = mustParsesJSTableScriptRows(foundTable)
			rows.forEach((cells, rowIndex) => {
				const nameCell = cells[header.mustGetColIndex('Name')]
				const { id, name } = mustGetIdAndName(nameCell, /\/(\w+_\d+)/, rowIndex)
				setLogPrefix(`honeyhunter: character '${name}'`)

				const rarityCell = cells[header.mustGetColIndex('Rarity')]
				const rarity = mustCountRarityStars(rarityCell, null, 'cur_icon', false)

				const elemCell = cells[header.mustGetColIndex('Element')]
				const elemRawCode = mustFindNodeAttrMatch(elemCell, 'img', null, 'src', /element\/(\w+?)_/)[1]
				const isTraveler = elemRawCode === 'none'
				const elementCode = isTraveler
					? 'anemo'
					: checkedElementCode(elemRawCode, `character '${name}'`)

				const weaponCell = cells[header.mustGetColIndex('Weapon')]
				const weapRe = /weapon_types\/(\w+?)_/
				const weaponRawCode = mustFindNodeAttrMatch(weaponCell, 'img', null, 'src', weapRe)[1]
				const weaponTypeCode = checkedWeaponTypeCode(weaponRawCode, `character '${name}'`)

				const materialCodes = []
				searchNodeWithTag(cells[header.mustGetColIndex('Ascension Materials')], 'a', node => {
					tryWithContext(`honeyhunter: character '${name}'`, 'skipping item', null, () => {
						const id = mustFindNodeHrefMatch(node, /\/i_(n?\d+)/)[1]
						const item = id2item.get(id)
						if (!item) throw new Error(`unknown item #${id}`)
						const type = item.types.find(x => x.startsWith('character-material-'))
						if (!type) throw new Error(`item '${item.code}' has wrong types: [${item.types}]`)
						materialCodes.push(withMaxRarityInGroup(item).code)
					})
					return 'skip-children'
				})

				addLangItem(id2characterLang, lang, {
					id,
					name,
					rarity,
					elementCode,
					weaponTypeCode,
					materialCodes,
				})
			})
		})
	}

	for (const [id, character] of id2characterLang.entries()) {
		const fix = fixes.statuses.characters.find(
			x => x.actually === 'unreleased' && x.name === character.en.name,
		)
		if (fix) {
			fix._used = true
			id2characterLang.delete(id)
		}
	}

	const code2character = /**@type {import('#lib/parsing').Code2CharacterData}*/ ({})

	for (const [_, char] of id2characterLang.entries()) {
		const code = getCharacterCodeFromName(char.en.name)
		const name = makeLangMap(char, 'name')

		/** @type {import('#lib/parsing').CharacterData} */
		const data = {
			code,
			name,
			rarity: ensureSame(char, 'rarity'),
			weaponTypeCode: ensureSame(char, 'weaponTypeCode'),
			releaseVersion: '1.0',
			materialCodes: ensureSame(char, 'materialCodes'),
		}

		const code2item = Object.fromEntries([...id2item.values()].map(x => [x.code, x]))
		sortCharacterMaterialItems(data.materialCodes, code => code, code2item, {})

		if (code === 'traveler') {
			// путешественник встречается два раза: М и Ж
			if (!('traveler-anemo' in code2character)) {
				for (const [element, langNames] of Object.entries(fixes.travelerLangNames)) {
					const code = 'traveler-' + element
					code2character[code] = {
						...data,
						code,
						name: langNames,
						materialCodes: [],
					}
				}
			}
		} else {
			code2character[code] = data
		}
	}

	applyItemsPostFixes(fixes.postProcess.characters, null, code2character)
	return { code2item: code2character }
}
