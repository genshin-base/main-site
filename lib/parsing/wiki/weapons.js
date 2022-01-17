import { getWeaponCodeFromName } from '#lib/genshin.js'
import {
	getTextContent,
	isNode,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	searchNodeWithClass,
} from '#lib/xml.js'
import { getWikiPage } from './common.js'
import { processCachedYaml } from '#lib/utils/os.js'
import { arrSplitFn } from '#lib/utils/collections.js'
import { progress, warn } from '#lib/utils/logs.js'

/**
 * @param {string} cacheDir
 * @param {import("#lib/parsing").Code2WeaponData} code2weapon
 */
export async function applyWeaponsObtainData(cacheDir, code2weapon) {
	const code2pagePath = new Map()
	const root = await getWikiPage('Category:Weapons', cacheDir, 'en')
	searchNodeWithClass(root, 'category-page__member', (node, ancestors) => {
		const name = getTextContent(mustFindNodeByClass(node, 'category-page__member-link'))
		const code = getWeaponCodeFromName(name)
		if (code in code2weapon) {
			const path = mustFindNodeHrefMatch(node, /^\/wiki\/(.*)/)[1]
			code2pagePath.set(code, path)
		}
		return 'skip-children'
	})

	const code2source = await processCachedYaml(
		`${cacheDir}/wiki/weapon_sources.yaml`,
		/** @type {Record<string,import('#lib/genshin').GI_WeaponObtainSource[]>} */ ({}),
		async code2source => {
			for (const [code, path] of code2pagePath) {
				if (!(code in code2source)) {
					const sources = await extractWeaponObtainSource(cacheDir, path)
					code2source[code] = sources
				}
			}
			return code2source
		},
	)
	progress()

	for (const [code, weapon] of Object.entries(code2weapon)) {
		const sources = code2source[code]
		if (sources) {
			weapon.obtainSources.length = 0
			weapon.obtainSources.push(...sources)
		} else warn(`weapon '${code}': could not find obtain-info on wiki`)
	}
}

/**
 * @param {string} cacheDir
 * @param {string} path
 */
async function extractWeaponObtainSource(cacheDir, path) {
	const root = await getWikiPage(path, cacheDir, 'en')

	const sources = []
	searchNodeWithClass(root, 'pi-item', (node, ancestors) => {
		if (node.attrs['data-source'] !== 'obtain') return false

		const chunks = arrSplitFn(
			mustFindNodeByClass(node, 'pi-data-value').children,
			x => isNode(x) && x.tag === 'br',
		)
		for (const chunk of chunks) {
			const text = chunk.map(getTextContent).join('').toLocaleLowerCase()
			const source = guessWeaponObtainSource(text)
			if (source === null) warn(`wiki page '${path}': unexpected obtain source line '${text}'`)
			else sources.push(source)
		}
		return 'skip-children'
	})

	return sources
}

/**
 * @param {string} text
 * @returns {import('#lib/genshin').GI_WeaponObtainSource|null}
 */
function guessWeaponObtainSource(text) {
	if (text === 'wishes') return 'wishes'
	if (text === 'weapon event wishes') return 'event-wishes'
	if (text.endsWith(' event')) return 'events'

	if (text.startsWith('battle pass ')) return 'battle-pass'
	if (text === "paimon's bargains") return 'in-game-shop'

	if (text === 'forging') return 'forging'
	if (text === 'inazuma fishing association') return 'fishing'
	if (text.startsWith('sold by ')) return 'npc-shop'

	if (text === 'chests') return 'chests'
	if (text.startsWith('talk to ')) return 'quest'
	if (text.endsWith(' quest')) return 'quest'
	if (text.endsWith(' puzzle')) return 'puzzle'
	if (text.includes('stuck inside a stone')) return 'puzzle'
	if (text === 'investigation') return 'investigation'

	if (text === 'adventure rank 10 reward') return 'adventure-rank-10'
	if (text.includes('ps4/ps5')) return 'playstation'
	return null
}
