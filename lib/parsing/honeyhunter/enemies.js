import { getEnemyCodeFromName } from '#lib/genshin.js'
import { tryWithContext, progress } from '#lib/utils/logs.js'
import {
	searchNodeWithClass,
	getTextContent,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	searchNodeWithTag,
	findNodeByClass,
} from '#lib/xml.js'
import { getHoneyPage, addLangItem, makeLangMap, ensureSame, mustGetItemOrArtSet } from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {Map<string, import('#lib/parsing').ArtifactSetData>} id2artSet
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{code2item:import('#lib/parsing').Code2EnemyData}>}
 */
export async function extractEnemiesData(cacheDir, langs, id2item, id2artSet, fixes) {
	/**
	 * @typedef {{
	 *   id: string,
	 *   name: string,
	 *   dropItemCodes: string[],
	 *   dropArtSetCodes: string[],
	 * }} EnemyLang
	 */
	const id2enemy = /**@type {import('./common').IdLangMap<EnemyLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('enemy', cacheDir, lang)

		searchNodeWithClass(root, 'enemy_sea_cont', (node, ancestors) => {
			tryWithContext(`#${id2enemy.size} enemy elem`, 'skipping', null, setLogPrefix => {
				const name = getTextContent(mustFindNodeByClass(node, 'sea_charname')).trim()
				setLogPrefix(`enemy '${name}'`)

				const [, flag, id] = mustFindNodeHrefMatch(node, /^\/db\/monster\/(m|ndm)_(\d+)/)
				if (flag === 'ndm') return

				const matWrap = findNodeByClass(node, 'sea_char_mat_cont')
				if (!matWrap) return //враги без дропа пока не нужны

				const dropItemCodes = []
				const dropArtSetCodes = []
				searchNodeWithTag(matWrap, 'a', node => {
					const href = node.attrs.href ?? ''
					const [type, item] = mustGetItemOrArtSet(href, id2item, id2artSet)
					;(type === 'item' ? dropItemCodes : dropArtSetCodes).push(item.code)
					return 'skip-children'
				})

				addLangItem(id2enemy, lang, { id, name, dropItemCodes, dropArtSetCodes })
			})
			return 'skip-children'
		})
		progress()
	}

	const code2enemy = /**@type {import('#lib/parsing').Code2EnemyData}*/ ({})
	for (const enemy of id2enemy.values()) {
		const code = getEnemyCodeFromName(enemy.en.name)
		code2enemy[code] = {
			code,
			name: makeLangMap(enemy, 'name'),
			drop: {
				itemCodes: ensureSame(enemy, 'dropItemCodes').sort(),
				artifactSetCodes: ensureSame(enemy, 'dropArtSetCodes').sort(),
			},
		}
	}
	return { code2item: code2enemy }
}
