import { getCharacterCodeFromName, GI_ELEMENT_CODES } from '#lib/genshin.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import {
	getTextContent,
	mustFindNodeAttrMatch,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	searchNodeWithClass,
	searchNodeWithTag,
} from '#lib/xml.js'
import { addLangItem, ensureSame, getHoneyPage, makeLangMap, mustCountRarityStars } from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{code2item:import('#lib/parsing').Code2CharacterData}>}
 */
export async function extractCharactersData(cacheDir, langs, id2item, fixes) {
	/**
	 * @typedef {{
	 *   id: string,
	 *   name: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode,
	 *   elementCode: import('#lib/genshin').GI_ElementCode,
	 *   materialCodes: string[],
	 * }} CharacterLang
	 */
	const id2characterLang = /**@type {import('./common').IdLangMap<CharacterLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('char/characters', cacheDir, lang)

		searchNodeWithClass(root, 'char_sea_cont', (node, ancestors) => {
			tryWithContext(`#${id2characterLang.size} character elem`, 'skipping', null, setLogPrefix => {
				const name = getTextContent(mustFindNodeByClass(node, 'sea_charname')).trim()
				setLogPrefix(`character '${name}'`)

				const id = mustFindNodeHrefMatch(node, /\/char\/([^/]+)/)[1]

				const rarity = mustCountRarityStars(node, 'sea_charstarcont', 'sea_char_stars_wrap', false)

				const re = /^\/img\/icons\/element\/(\w+?)_\d+/
				let elementCode = mustFindNodeAttrMatch(node, 'img', null, 'data-src', re)[1]
				if (!GI_ELEMENT_CODES.includes(/**@type {*}*/ (elementCode))) {
					warn(`character '${name}': wring element '${elementCode}'`)
					elementCode = 'anemo'
				}

				const materialCodes = []
				const matWrap = mustFindNodeByClass(node, 'sea_char_mat_cont')
				searchNodeWithTag(matWrap, 'a', node => {
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
					return 'skip-children'
				})

				addLangItem(id2characterLang, lang, { id, name, rarity, elementCode, materialCodes })
			})
			return 'skip-children'
		})
		progress()
	}

	const code2character = /**@type {import('#lib/parsing').Code2CharacterData}*/ ({})
	for (const char of id2characterLang.values()) {
		let code = getCharacterCodeFromName(char.en.name)
		let name = makeLangMap(char, 'name')

		if (code === 'traveler') {
			const elementCode = ensureSame(char, 'elementCode')
			code = elementCode + '-traveler'
			if (code in code2character) continue //каждая стихия встречается по два раза: М и Ж

			const fixedName = fixes.travelerLangNames[elementCode] ?? {}
			for (const lang in name)
				if (!(lang in fixedName))
					warn(`no special ${lang} ${elementCode}-traveler name, using general '${name[lang]}'`)
			name = fixedName
		}

		code2character[code] = {
			code,
			name: makeLangMap(char, 'name'),
			rarity: ensureSame(char, 'rarity'),
			releaseVersion: '1.0',
			materialCodes: ensureSame(char, 'materialCodes'),
		}
	}
	return { code2item: code2character }
}
