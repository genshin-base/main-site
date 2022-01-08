import { getArtifactCodeFromName, getDomainCodeFromName, getItemCodeFromName } from '#lib/genshin.js'
import { arrPushIfNew, sortObject } from '#lib/utils/collections.js'
import { progress, warn } from '#lib/utils/logs.js'
import { searchNode, isNode, getTextContent } from '#lib/xml.js'
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
		searchNode(root, (node, ancestors) => {
			if (!isNode(node)) return false

			if ((node.attrs.class ?? '').includes('enemy_type')) {
				const text = getTextContent(node).trim()
				if (/^artifacts$/i.test(text)) type = 'artifacts'
				else if (/^weapon ascension materials$/i.test(text)) type = 'weapons'
				else if (/^talent level-up material$/i.test(text)) type = 'talents'
				else {
					type = null
					return 'skip-children'
				}
			}

			if (type !== null && node.tag === 'a') {
				let m = (node.attrs.href ?? '').match(/^\/db\/dom\/dun_(\d+)/)
				if (m) {
					const id = m[1]

					const foundName = searchNode(node, x => {
						return isNode(x) && (x.attrs.class ?? '').includes('sea_charname')
					})
					if (!foundName)
						throw new Error(`can not find name elem inside ${type}-domain card with id=${id}`)
					const name = getTextContent(foundName.node).trim()

					addLangItem(id2domain, lang, { id, name, type })
					return 'skip-children'
				}
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

		searchNode(root, (node, ancestors) => {
			if (!(isNode(node) && node.tag === 'iframe')) return false
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
				if (!/ exp$/i.test(text) && !/^mora$/i.test(text)) {
					let m
					if ((m = text.match(/\(rarity \d+\)$/i)) !== null)
						text = text.slice(0, -m[0].length).trim()
					if ((m = text.match(/ set$/i)) !== null) text = text.slice(0, -m[0].length).trim()

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
				}
				return null
			},
		)

		domain.artifactCodes.sort()
		domain.weaponMaterialGroupCodes.sort()
	}
	return { items: domains }
}
