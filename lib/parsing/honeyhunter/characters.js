import { getCharacterCodeFromName } from '#lib/genshin.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import {
	getTextContent,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	nodeHasClass,
	searchNodeNodes,
} from '#lib/xml.js'
import { addLangItem, ensureSame, getHoneyPage, makeLangMap, mustCountRarityStars } from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{items:import('#lib/parsing').Code2CharacterData}>}
 */
export async function extractCharactersData(cacheDir, langs, fixes) {
	/** @typedef {{id:string, name:string, rarity:import('#lib/genshin').GI_RarityCode}} CharacterLang */
	const id2character = /**@type {import('./common').IdLangMap<CharacterLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('char/characters', cacheDir, lang)

		searchNodeNodes(root, (node, ancestors) => {
			if (!nodeHasClass(node, 'char_sea_cont')) return false

			tryWithContext(`#${id2character.size} character elem`, 'skipping', null, setLogPrefix => {
				const name = getTextContent(mustFindNodeByClass(node, 'sea_charname')).trim()
				setLogPrefix(`character '${name}`)

				const id = mustFindNodeHrefMatch(node, /\/char\/([^/]+)/)[1]

				const rarity = mustCountRarityStars(node, 'sea_charstarcont', 'sea_char_stars_wrap', false)

				addLangItem(id2character, lang, { id, name, rarity })
			})
			return 'skip-children'
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

	// traveler -> anemo-traveler, geo-trveler, ...
	const travelerData = characters['traveler']
	if (travelerData) {
		delete characters['traveler']
		for (const [elemCode, langNames] of Object.entries(fixes.travelerLangNames)) {
			for (const [lang, name] of Object.entries(travelerData.name))
				if (!(lang in langNames)) warn(`no special ${lang} traveler name, using general '${name}'`)

			characters[elemCode + '-traveler'] = {
				...travelerData,
				name: { ...travelerData.name, ...langNames },
			}
		}
	} else {
		warn(`'traveler' data not found, can not generate elemental copies`)
	}
	return { items: characters }
}
