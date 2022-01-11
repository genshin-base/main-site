import { getArtifactCodeFromName, getDomainCodeFromName, getItemCodeFromName } from '#lib/genshin.js'
import { arrPushIfNew, sortObject } from '#lib/utils/collections.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import { trimEndRe } from '#lib/utils/strings.js'
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
} from './common.js'

const LOCATION_OFFSET = { x: -751, y: 2336 }

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('#lib/parsing').Code2WeaponMaterialData} code2weaponMaterial
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{items:import('#lib/parsing').Code2DomainData}>}
 */
export async function extractDomainsData(cacheDir, langs, code2weaponMaterial, fixes) {
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
			artifactCodes: [],
			weaponMaterialGroupCodes: [],
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
			(cells, colIndex, rowIndex) => {
				let text = getTextContent(cells[colIndex.item]).trim()
				if (/ exp$/i.test(text) || /mora$/i.test(text)) return null

				text = trimEndRe(text, /\(rarity \d+\)$/i)
				text = trimEndRe(text, / set$/i)

				if (domain.type === 'artifacts') {
					arrPushIfNew(domain.artifactCodes, getArtifactCodeFromName(text))
				} else if (domain.type === 'weapons') {
					const code = getItemCodeFromName(text)
					const material = code2weaponMaterial[code]
					if (material) {
						arrPushIfNew(domain.weaponMaterialGroupCodes, material.craftGroupCode)
					} else {
						warn(`domain '${domain.code}': unknown item '${code}', skipping`)
					}
				}
				return null
			},
		)

		domain.artifactCodes.sort()
		domain.weaponMaterialGroupCodes.sort()
	}
	return { items: domains }
}
