import { createReadStream, promises as fs } from 'fs'
import { getFileCached } from '#lib/requests.js'
import { progress } from '#lib/utils/logs.js'
import { forEachTBodyRow, isNode, parseXmlStream, searchNodeWithTag } from '#lib/xml.js'

const ORIGIN = `https://genshin-impact.fandom.com`

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @returns {Promise<import('#lib/xml').Node>}
 */
export async function getWikiPage(path, cacheDir, lang) {
	await fs.mkdir(`${cacheDir}/wiki`, { recursive: true })
	const url = `${ORIGIN}/${lang === 'en' ? '' : lang + '/'}wiki/${path}`
	const fpath = `${cacheDir}/wiki/${path.replace(/\//g, '-')}-${lang}.html`
	const cacheUsed = await getFileCached(url, null, fpath, false, Infinity)
	if (!cacheUsed) progress()
	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}

/**
 * @template THead
 * @param {import('#lib/xml').Node} tableNode
 * @param {(headerCells:import('#lib/xml').Node[]) => THead} headerFunc
 * @param {(cells:import('#lib/xml').Node[], header:THead, rowIndex:number) => unknown} rowFunc
 */
export function mustForEachTableRow(tableNode, headerFunc, rowFunc) {
	let foundHeader = searchNodeWithTag(tableNode, 'thead', node => true)

	if (!foundHeader) {
		const foundTBody = searchNodeWithTag(tableNode, 'tbody', tbody => true)
		if (foundTBody) {
			headerSearch: for (const row of foundTBody.node.children)
				if (isNode(row))
					for (const cell of row.children)
						if (isNode(cell) && cell.tag === 'th') {
							foundHeader = { node: row, ancestors: [] }
							break headerSearch
						}
		}
	}

	if (!foundHeader) throw new Error('table header not found')
	const header = headerFunc(foundHeader.node.children.filter(isNode))

	searchNodeWithTag(tableNode, 'tbody', tbody => {
		forEachTBodyRow(tbody, (row, cells, rowIndex) => {
			rowFunc(cells, header, rowIndex)
		})
		return 'skip-children'
	})
}
