import { getDomainCodeFromName } from '#lib/genshin'
import { searchNode, isNode, getTextContent } from '#lib/xml'
import { warn } from 'console'
import { getHoneyPage, addLangItem, forEachSortedLangItem, ensureSame, makeLangMap } from './common'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{items:import('#lib/parsing').DomainsInfo}>}
 */
export async function extractDomainsData(cacheDir, langs, fixes) {
	/** @typedef {{id:string, name:string, type:string}} DomainLang */
	const id2domain = /**@type {import('./common').IdLangMap<DomainLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('domains', cacheDir, lang)

		let type = null
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
	}

	const id2code = {}
	const domains =
		/**@type {Record<string,{code:string, type:string, name:Record<string,string>, location:[number,number]}>}*/ ({})
	forEachSortedLangItem(id2domain, getDomainCodeFromName, (code, domain) => {
		domains[code] = {
			code,
			type: ensureSame(domain, 'type'),
			name: makeLangMap(domain, 'name'),
			location: [0, 0],
		}
		id2code[code] = ensureSame(domain, 'id')
	})

	for (const domain of Object.values(domains)) {
		const root = await getHoneyPage(`dom/dun_${id2code[domain.code]}`, cacheDir, 'en')
		searchNode(root, (node, ancestors) => {
			if (!(isNode(node) && node.tag === 'iframe')) return false
			const m = (node.attrs.src ?? '').match(/pin=(-?\d+(?:\.\d+)?)\|(-?\d+(?:\.\d+)?)/)
			if (!m) return false
			domain.location = [Math.round(parseFloat(m[1])), Math.round(parseFloat(m[2]))]
			return true
		})
		if (domain.location[0] === 0 && domain.location[0] === 0)
			warn(`can not get '${domain.code}' domain location`)
	}
	return { items: domains }
}
