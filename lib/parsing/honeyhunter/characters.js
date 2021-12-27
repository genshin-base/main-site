import { getCharacterCodeFromName } from '#lib/genshin.js'
import { mustBeDefined, progress, warn } from '#lib/utils.js'
import { getTextContent, isNode, searchNode } from '#lib/xml.js'
import { addLangItem, checkedRarity, ensureSame, getHoneyPage, makeLangMap } from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<{items:import('#lib/parsing').Code2CharacterData}>}
 */
export async function extractCharactersData(cacheDir, langs) {
	/** @typedef {{id:string, name:string, rarity:import('#lib/genshin').GI_RarityCode}} CharacterLang */
	const id2character = /**@type {import('./common').IdLangMap<CharacterLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('char/characters', cacheDir, lang)

		searchNode(root, (node, ancestors) => {
			if (isNode(node) && node.attrs.class?.includes('char_sea_cont')) {
				const foundName = searchNode(node, x => isNode(x) && x.attrs.class?.includes('sea_charname'))
				if (!foundName) {
					warn(`can not find character title in #${id2character.size} character elem, skipping`)
					return 'skip-children'
				}
				const href = mustBeDefined(foundName.ancestors.at(-1)).attrs.href ?? ''
				const m = href.match(/\/char\/([^/]+)/)
				if (!m) throw new Error(`can not get character id from <a>.href '${href}'`)
				const id = m[1]
				const name = getTextContent(foundName.node).trim()

				let starCount = 0
				searchNode(node, node => {
					if (!isNode(node)) return false
					if (!node.attrs.class?.includes('stars_wrap')) return false
					starCount++
					return 'skip-children'
				})
				const rarity = checkedRarity(starCount)

				addLangItem(id2character, lang, { id, name, rarity })
				return 'skip-children'
			}
			return false
		})
		progress()
	}

	const characters = /**@type {import('#lib/parsing').Code2CharacterData}*/ ({})
	for (const char of id2character.values()) {
		const code = getCharacterCodeFromName(char.en.name)
		characters[code] = {
			code,
			name: makeLangMap(char, 'name'),
			rarity: ensureSame(char, 'rarity'),
		}
	}
	return { items: characters }
}
