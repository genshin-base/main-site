import { getCharacterCodeFromName } from '#lib/genshin.js'
import { mustBeDefined } from '#lib/utils.js'
import { getTextContent, isNode, searchNode } from '#lib/xml.js'
import { addLangItem, getHoneyPage, makeLangMap } from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<{langNames:import('#lib/parsing').ItemsLangNames}>}
 */
export async function extractCharactersData(cacheDir, langs) {
	const id2character = /**@type {import('./common').IdLangMap<{id:string, name:string}>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('char/characters', cacheDir, lang)

		searchNode(root, (node, ancestors) => {
			if (isNode(node) && node.attrs.class?.includes('sea_charname')) {
				const href = mustBeDefined(ancestors.at(-1)).attrs.href ?? ''
				const m = href.match(/\/char\/([^/]+)/)
				if (!m) throw new Error(`can not get character id from <a>.href '${href}'`)
				const id = m[1]
				addLangItem(id2character, lang, { id, name: getTextContent(node) })
			}
			return false
		})
	}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	for (const char of id2character.values()) {
		const code = getCharacterCodeFromName(char.en.name)
		langNames[code] = makeLangMap(char, 'name')
	}
	return { langNames }
}
