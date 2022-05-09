import { getEnemyCodeFromName } from '#lib/genshin.js'
import { arrShallowEqualAsSets } from '#lib/utils/collections.js'
import { tryWithContext, progress, warn } from '#lib/utils/logs.js'
import { capitaliseFirst, findMostCommonWords } from '#lib/utils/strings.js'
import {
	searchNodeWithClass,
	getTextContent,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	searchNodeWithTag,
	findNodeByClass,
} from '#lib/xml.js'
import {
	getHoneyPage,
	addLangItem,
	makeLangMap,
	ensureSame,
	mustGetItemOrArtSet,
	mustGetImgUrl,
} from './common.js'
import { applyItemsPostFixes, shouldSkipByFix } from './fixes.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {Map<string, import('#lib/parsing').ArtifactSetData>} id2artSet
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{
 *   code2item: import('#lib/parsing').Code2EnemyData,
 *   id2item: Map<string, import('#lib/parsing').EnemyData>,
 *   code2img: import('./common').Code2ImageUrl,
 * }>}
 */
export async function extractEnemiesData(cacheDir, langs, id2item, id2artSet, fixes) {
	/**
	 * @typedef {{
	 *   id: string,
	 *   name: string,
	 *   img: string,
	 *   dropItemCodes: string[],
	 *   dropArtSetCodes: string[],
	 * }} EnemyLang
	 */
	const id2enemyLang = /**@type {import('./common').IdLangMap<EnemyLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('enemy', cacheDir, lang)

		searchNodeWithClass(root, 'enemy_sea_cont', (node, ancestors) => {
			tryWithContext(`#${id2enemyLang.size} enemy elem`, 'skipping', null, setLogPrefix => {
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

				const img = mustGetImgUrl(mustFindNodeByClass(node, 'enemy_avatar_cont'))
				addLangItem(id2enemyLang, lang, { id, name, img, dropItemCodes, dropArtSetCodes })
			})
			return 'skip-children'
		})
		progress()
	}

	const code2enemy = /**@type {import('#lib/parsing').Code2EnemyData}*/ ({})
	const id2enemy = /**@type {Map<string, import('#lib/parsing').EnemyData>}*/ (new Map())
	const code2img = /**@type {Map<string, string>}*/ (new Map())
	for (const [id, enemy] of id2enemyLang.entries()) {
		if (shouldSkipByFix(fixes.skip.enemies, enemy.en.name)) continue

		const item = {
			code: getEnemyCodeFromName(enemy.en.name),
			name: makeLangMap(enemy, 'name'),
			locations: [],
			drop: {
				itemCodes: ensureSame(enemy, 'dropItemCodes').sort(),
				artifactSetCodes: ensureSame(enemy, 'dropArtSetCodes').sort(),
			},
		}
		code2enemy[item.code] = item
		id2enemy.set(id, item)
		code2img.set(item.code, ensureSame(enemy, 'img'))
	}
	applyItemsPostFixes(fixes.postProcess.enemies, id2enemy, code2enemy, code2img)
	return { code2item: code2enemy, id2item: id2enemy, code2img }
}

/**
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {{code2item:import('#lib/parsing').Code2EnemyGroupData}}
 */
export function makeEnemyGroups(code2enemy, fixes) {
	/** @type {Map<string, {name:Record<string,string>, enemies:import('#lib/parsing').EnemyData[]}>} */
	const drop2rawGroup = new Map()
	for (const enemy of Object.values(code2enemy)) {
		const manualGroup = fixes.manualEnemyGroups.find(x => x.origNames.test(enemy.name.en))
		const key = manualGroup
			? 'mg-' + manualGroup.origNames
			: enemy.drop.itemCodes.sort().join('|') + '|' + enemy.drop.artifactSetCodes.sort().join('|')

		const group = drop2rawGroup.get(key)
		if (group) group.enemies.push(enemy)
		else drop2rawGroup.set(key, { enemies: [enemy], name: manualGroup?.name ?? {} })
	}

	const code2group = /**@type {import('#lib/parsing').Code2EnemyGroupData}*/ ({})
	for (const group of drop2rawGroup.values()) {
		if (group.enemies.length > 1) {
			const name = /**@type {Record<string,string>}*/ ({})
			for (const lang in group.enemies[0].name)
				name[lang] =
					group.name?.[lang] ??
					capitaliseFirst(findMostCommonWords(group.enemies.map(x => x.name[lang])))
			const code = getEnemyCodeFromName(name.en)

			code2group[code] = {
				code,
				name,
				iconEnemyCode: group.enemies.map(x => x.code).sort()[0],
				enemyCodes: group.enemies.map(x => x.code),
				locations: [],
			}
		}
	}
	return { code2item: code2group }
}

/**
 * @param {import('#lib/parsing').Code2EnemyData} code2enemy
 * @param {import('#lib/parsing').Code2EnemyGroupData} code2group
 * @returns {void}
 */
export function replaceEnemiesByGroups(code2enemy, code2group) {
	for (const group of Object.values(code2group)) {
		const first = code2enemy[group.enemyCodes[0]]
		for (let i = 1; i < group.enemyCodes.length; i++) {
			const cur = code2enemy[group.enemyCodes[i]]
			const dropIsSame =
				arrShallowEqualAsSets(first.drop.itemCodes, cur.drop.itemCodes) &&
				arrShallowEqualAsSets(first.drop.artifactSetCodes, cur.drop.artifactSetCodes)
			if (!dropIsSame)
				warn(
					`group '${group.code}': enemies '${first.code}' and '${cur.code}'` +
						` have different drop, ignoring second one`,
				)
		}

		for (const code of group.enemyCodes) delete code2enemy[code]

		code2enemy[group.code] = {
			code: group.code,
			name: group.name,
			drop: first.drop,
			locations: group.locations,
		}
	}
}
