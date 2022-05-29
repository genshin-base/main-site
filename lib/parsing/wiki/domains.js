import { getDomainCodeFromName, GI_REGION_CODES } from '#lib/genshin.js'
import { tryWithContext, warn } from '#lib/utils/logs.js'
import { getTextContent, mustFindCellIndex, searchNodeWithClass, searchNodeWithTag } from '#lib/xml.js'
import { getWikiPage, mustForEachTableRow } from './common.js'

/**
 * @param {string} cacheDir
 * @param {import("#lib/parsing").Code2DomainData} code2domain
 */
export async function applyDomainsRegion(cacheDir, code2domain) {
	const root = await getWikiPage('Domains/List', cacheDir, 'en')
	const appliedToCodes = new Set()
	searchNodeWithClass(root, 'article-table', node => {
		tryWithContext('wiki domains', 'skipping', null, () => {
			mustForEachTableRow(
				node,
				headerCells => ({
					name: mustFindCellIndex(headerCells, /^name$/i),
					location: mustFindCellIndex(headerCells, /^location$/i),
				}),
				(cells, colIndex, rowIndex) => {
					const name = getTextContent(cells[colIndex.name]).trim()
					const locationNode = cells[colIndex.location]

					const code = getDomainCodeFromName(name)
					if (!(code in code2domain)) return false

					let region = null
					searchNodeWithTag(locationNode, 'a', node => {
						const rCode = getTextContent(node).trim().toLocaleLowerCase()
						if (GI_REGION_CODES.includes(/**@type {*}*/ (rCode))) region = rCode
						return !!region
					})
					if (region) {
						code2domain[code].region = region
						appliedToCodes.add(code)
					} else warn(`domain '${code}': can not extract region from wiki page`)
				},
			)
		})
		return 'skip-children'
	})

	for (const domain of Object.values(code2domain)) {
		if (!appliedToCodes.has(domain.code))
			warn(`domain '${domain.code}': could not get region from wiki, using '${domain.region}'`)
	}
}
