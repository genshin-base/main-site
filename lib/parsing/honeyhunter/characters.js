import { getCharacterCodeFromName, getWithMaxRarity } from '#lib/genshin.js'
import { arrPushIfNew } from '#lib/utils/collections.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import { mustBeDefined } from '#lib/utils/values.js'
import {
	getTextContent,
	mustFindNodeAttrMatch,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	searchNodeWithClass,
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
	mapTableRows,
	mustCountRarityStars,
	mustGetItem,
} from './common.js'
import { groupItemsByCraft } from './items.js'

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
	const id2characterLang = /**@type {import('./common').IdLangMap<CharacterLang>}*/ (new Map())
	const betaCharacterIds = new Set()

	for (const lang of langs) {
		{
			const root = await getHoneyPage('char/characters', cacheDir, lang)
			await extractCharactersFromPage(root, id2item, `${lang}-characters`, charLang => {
				addLangItem(id2characterLang, lang, charLang)
			})
		}
		if (fixes.statuses.characters.some(x => x.actually === 'released')) {
			const root = await getHoneyPage('char/unreleased-and-upcoming-characters', cacheDir, lang)
			await extractCharactersFromPage(root, id2item, `${lang}-beta-characters`, charLang => {
				addLangItem(id2characterLang, lang, charLang)
				betaCharacterIds.add(charLang.id)
			})
		}
	}

	const code2id = /**@type {Map<string, string>}*/ (new Map())
	const code2character = /**@type {import('#lib/parsing').Code2CharacterData}*/ ({})
	for (const [id, char] of id2characterLang.entries()) {
		let code = getCharacterCodeFromName(char.en.name)
		let name = makeLangMap(char, 'name')

		if (betaCharacterIds.has(id)) {
			const fix = fixes.statuses.characters.find(x => x.actually === 'released' && x.name === name.en)
			if (fix) fix._used = true
			else continue
		}
		const fix = fixes.statuses.characters.find(x => x.actually === 'unreleased' && x.name === name.en)
		if (fix) {
			fix._used = true
			continue
		}

		if (code === 'traveler') {
			const elementCode = ensureSame(char, 'elementCode')
			code = 'traveler-' + elementCode
			if (code in code2character) continue //каждая стихия встречается по два раза: М и Ж

			const fixedName = { ...(fixes.travelerLangNames[elementCode] ?? {}) }
			for (const lang in name)
				if (!(lang in fixedName)) {
					warn(`no special ${lang} ${code} name, using general '${name[lang]}'`)
					fixedName[lang] = name[lang]
				}
			name = fixedName
		}

		code2character[code] = {
			code,
			name,
			rarity: ensureSame(char, 'rarity'),
			weaponTypeCode: ensureSame(char, 'weaponTypeCode'),
			releaseVersion: '1.0',
			materialCodes: ensureSame(char, 'materialCodes'),
		}
		code2id.set(code, id)
	}

	const itemCode2craftGroup = groupItemsByCraft(Array.from(id2item.values()))
	function withMaxRarityInGroup(item) {
		return getWithMaxRarity(mustBeDefined(itemCode2craftGroup.get(item.code)))
	}

	for (const character of Object.values(code2character)) {
		// материалы талантов всех, кроме Путешественника, полностью выпарсиваются из общей таблички
		if (character.code.startsWith('traveler-')) {
			const id = mustBeDefined(code2id.get(character.code))

			const root = await getHoneyPage(`char/${id}`, cacheDir, 'en')
			tryWithContext('traveler details', 'skipping', null, () => {
				const foundLiveData = searchNodeWithClass(
					root,
					'data_cont_wrapper',
					node => node.attrs.id === 'live_data',
				)
				if (!foundLiveData) throw new Error('can not find character live data')

				mapTableRows(
					foundLiveData.node,
					/Talent Ascension Materials \(All 3 Talents lvl 10\)/i,
					headerCells => {
						searchNodeWithTag(headerCells[0], 'a', node => {
							const item = mustGetItem(node.attrs.href ?? '', id2item)
							if (item.types.some(x => x.startsWith('character-material-')))
								if (item.code !== 'crown-of-insight')
									arrPushIfNew(character.materialCodes, withMaxRarityInGroup(item).code)
							return 'skip-children'
						})
					},
					() => null,
				)
			})
		}

		const code2item = Object.fromEntries([...id2item.values()].map(x => [x.code, x]))
		sortCharacterMaterialItems(character.materialCodes, code => code, code2item, {})
	}

	return { code2item: code2character }
}

/**
 * @param {import('#lib/xml').Node} root
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {string} logPrefix
 * @param {(character:CharacterLang) => unknown} itemFunc
 */
async function extractCharactersFromPage(root, id2item, logPrefix, itemFunc) {
	let rowNum = 1
	searchNodeWithClass(root, 'char_sea_cont', (node, ancestors) => {
		tryWithContext(`${logPrefix}: #${rowNum++} character elem`, 'skipping', null, setLogPrefix => {
			const name = getTextContent(mustFindNodeByClass(node, 'sea_charname')).trim()
			setLogPrefix(`${logPrefix}: character '${name}'`)

			const id = mustFindNodeHrefMatch(node, /\/char\/([^/]+)/)[1]

			const rarity = mustCountRarityStars(node, 'sea_charstarcont', 'sea_char_stars_wrap', false)

			const re = /^\/img\/icons\/element\/(\w+?)_\d+/
			const rawElemCode = mustFindNodeAttrMatch(node, 'img', null, 'data-src', re)[1]
			const elementCode = checkedElementCode(rawElemCode, `character '${name}'`)

			const weapRe = /^\/img\/icons\/weapon_types\/(\w+)_/
			const weapTypeRaw = mustFindNodeAttrMatch(node, 'img', null, 'data-src', weapRe)[1]
			const weaponTypeCode = checkedWeaponTypeCode(weapTypeRaw, `character '${name}'`)

			const materialCodes = []
			const matWrap = mustFindNodeByClass(node, 'sea_char_mat_cont')
			searchNodeWithTag(matWrap, 'a', node => {
				tryWithContext(`${logPrefix}: character '${name}' items`, 'skipping item', null, () => {
					// У книжки повышения таланта кривая ссылка:
					// вместо /db/char/i_<id>/ она ведёт на /db/char/<персонаж>/.
					// Зато внутри есть картинка с правильным айдишником.
					const re = /^\/img\/(?:upgrade\/\w+|ingredient)\/i_(\d+)/
					const id = mustFindNodeAttrMatch(node, 'img', null, 'data-src', re)[1]
					const item = id2item.get(id)
					if (!item) throw new Error(`unknown item #${id}`)
					const type = item.types.find(x => x.startsWith('character-material-'))
					if (!type) throw new Error(`item '${item.code}' has wrong types: [${item.types}]`)
					materialCodes.push(item.code)
				})
				return 'skip-children'
			})

			itemFunc({ id, name, rarity, elementCode, weaponTypeCode, materialCodes })
		})
		return 'skip-children'
	})
	progress()
}
