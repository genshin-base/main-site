import { getDomainCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import {
	getTextContent,
	nodeHasClass,
	searchNodeNodes,
	mustFindNodeHrefMatch,
	mustFindNodeByClass,
} from '#lib/xml.js'
import {
	getHoneyPage,
	addLangItem,
	ensureSame,
	makeLangMap,
	mapTableRows,
	mustFindCellIndex,
	mustGetItemOrArtSet,
} from './common.js'

const LOCATION_OFFSET = { x: -751, y: 2336 }

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {Map<string, import('#lib/parsing').ArtifactSetData>} id2artSet
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{items:import('#lib/parsing').Code2DomainData}>}
 */
export async function extractDomainsData(cacheDir, langs, id2item, id2artSet, fixes) {
	/** @typedef {{id:string, name:string, type:import('#lib/parsing').DomainTypeCode}} DomainLang */

	const id2domain = /**@type {import('./common').IdLangMap<DomainLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('domains', cacheDir, lang)

		let type = /**@type {import('#lib/parsing').DomainTypeCode|null}*/ (null)
		searchNodeNodes(root, (node, ancestors) => {
			if (nodeHasClass(node, 'enemy_type')) {
				const text = getTextContent(node).trim()
				if (/^artifacts$/i.test(text)) type = 'artifacts'
				else if (/^weapon ascension materials$/i.test(text)) type = 'weapons'
				else if (/^talent level-up material$/i.test(text)) type = 'talents'
				else type = null
				return 'skip-children'
			}

			if (type !== null && nodeHasClass(node, 'char_sea_cont')) {
				tryWithContext(`${type}-domain`, 'skipping', null, setLogPrefix => {
					const id = mustFindNodeHrefMatch(node, /^\/db\/dom\/dun_(\d+)/)[1]
					setLogPrefix(`${type}-domain #${id}`)
					const name = getTextContent(mustFindNodeByClass(node, 'sea_charname')).trim()

					// const dropItemCodes = []
					// const dropArtifactSetCodes = []
					// const itemsWrap = mustFindNodeByClass(node, 'sea_char_mat_cont')
					// for (const itemElem of itemsWrap.children) {
					// 	if (!isNode(itemElem) || itemElem.tag !== 'a') continue
					// 	const href = itemElem.attrs.href ?? ''
					// 	let m
					// 	if ((m = href.match(/\/db\/item\/i_(\d+)/)) !== null) {
					// 		const item = id2item.get(m[1])
					// 		if (item) dropItemCodes.push(item.code)
					// 		else warn(`domain '${name}': unknown item #${m[1]}`)
					// 	} else if ((m = href.match(/\/db\/art\/family\/a_(\d+)/)) !== null) {
					// 		const artSet = id2artSet.get(m[1])
					// 		if (artSet) dropArtifactSetCodes.push(artSet.code)
					// 		else warn(`domain '${name}': unknown artifact set #${m[1]}`)
					// 	} else {
					// 		warn(`domain '${name}': unexteped item href="${href}"`)
					// 	}
					// }

					addLangItem(id2domain, lang, { id, name, type })
				})
				return 'skip-children'
			}
			return false
		})
		progress()
	}

	const id2code = {}
	const domains = /**@type {import('#lib/parsing').Code2DomainData}*/ ({})
	id2domain.forEach((domain, id) => {
		const code = getDomainCodeFromName(domain.en.name)
		domains[code] = {
			code,
			type: ensureSame(domain, 'type'),
			name: makeLangMap(domain, 'name'),
			drop: { itemCodes: [], artifactSetCodes: [] },
			location: [0, 0],
		}
		id2code[code] = ensureSame(domain, 'id')
	})
	sortObject(domains, ([, a], [, b]) => a.type.localeCompare(b.type) || a.code.localeCompare(b.code))

	for (const domain of Object.values(domains)) {
		const root = await getHoneyPage(`dom/dun_${id2code[domain.code]}`, cacheDir, 'en')

		searchNodeNodes(root, (node, ancestors) => {
			if (node.tag !== 'iframe') return false
			const m = (node.attrs.src ?? '').match(/pin=(-?\d+(?:\.\d+)?)\|(-?\d+(?:\.\d+)?)/)
			if (!m) return false
			domain.location = [
				-(Math.round(parseFloat(m[2])) - LOCATION_OFFSET.x),
				Math.round(parseFloat(m[1]) - LOCATION_OFFSET.y),
			]
			return true
		})
		if (domain.location[0] === 0 && domain.location[0] === 0)
			warn(`domain '${domain.code}': can not get location, using [${domain.location}]`)

		mapTableRows(
			root,
			/^Drops Summary$/i,
			header => ({ item: mustFindCellIndex(header.children, /^item$/i) }),
			(cells, colIndex, rowIndex) =>
				tryWithContext(`domain '${domain.code}' drop row #${rowIndex + 1}`, 'skipping', null, () => {
					const href = mustFindNodeHrefMatch(cells[colIndex.item], /^\/db\/.*/)[0]

					const [type, item] = mustGetItemOrArtSet(href, id2item, id2artSet)
					if (type === 'item') domain.drop.itemCodes.push(item.code)
					else domain.drop.artifactSetCodes.push(item.code)

					return null
				}),
		)

		domain.drop.itemCodes.sort()
		domain.drop.artifactSetCodes.sort()
	}
	return { items: domains }
}
