import { getCharacterCodeFromName } from '#lib/genshin.js'
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

				addLangItem(id2characterLang, lang, { id, name, rarity, materialCodes })
			})
			return 'skip-children'
		})
		progress()
	}

	const code2character = /**@type {import('#lib/parsing').Code2CharacterData}*/ ({})
	for (const char of id2characterLang.values()) {
		const code = getCharacterCodeFromName(char.en.name)
		code2character[code] = {
			code,
			name: makeLangMap(char, 'name'),
			rarity: ensureSame(char, 'rarity'),
			releaseVersion: '1.0',
			materialCodes: ensureSame(char, 'materialCodes'),
		}
	}

	// traveler -> anemo-traveler, geo-trveler, ...
	const travelerData = code2character['traveler']
	if (travelerData) {
		delete code2character['traveler']
		for (const [elemCode, langNames] of Object.entries(fixes.travelerLangNames)) {
			for (const [lang, name] of Object.entries(travelerData.name))
				if (!(lang in langNames)) warn(`no special ${lang} traveler name, using general '${name}'`)

			const code = elemCode + '-traveler'
			code2character[code] = {
				...travelerData,
				code,
				name: { ...travelerData.name, ...langNames },
			}
		}
	} else {
		warn(`'traveler' data not found, can not generate elemental copies`)
	}
	return { code2item: code2character }
}
