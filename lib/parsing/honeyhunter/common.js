import { createReadStream, promises as fs } from 'fs'
import { GI_RARITY_CODES } from '#lib/genshin.js'
import { mustBeDefined, warn } from '#lib/utils.js'
import { getTextContent, isNode, mustBeNode, parseXmlStream, searchNode } from '#lib/xml.js'
import { getFileCached } from '#lib/requests'

const ORIGIN = 'https://genshin.honeyhunterworld.com'

/** @template T @typedef {Map<string,Record<string,T>>} IdLangMap */

/** @typedef {Map<string,string>} Code2ImageUrl */

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @returns {Promise<import('#lib/xml').Node>}
 */
export async function getHoneyPage(path, cacheDir, lang) {
	await fs.mkdir(`${cacheDir}/honeyhunter`, { recursive: true })
	const url = `${ORIGIN}/db/${path}/`
	const fpath = `${cacheDir}/honeyhunter/${path.replace(/\//g, '-')}-${lang}.html`
	await getFileCached(url, { lang: lang.toLocaleUpperCase() }, fpath, false, Infinity)
	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}

/**
 * @template THead
 * @template TRes
 * @param {import('#lib/xml').Node} root
 * @param {RegExp} titleRe
 * @param {(header:import('#lib/xml').Node) => THead} headerFunc
 * @param {(cells:import('#lib/xml').Node[], header:THead, rowIndex:number) => TRes|null} rowFunc
 * @returns {Promise<TRes[]>}
 */
export async function mapTableRows(root, titleRe, headerFunc, rowFunc) {
	const res = []

	const foundTableTitleNodes = new Set()
	while (true) {
		const foundTitle = searchNode(root, (node, ancestors) => {
			return (
				isNode(node) &&
				(node.attrs.class ?? '').includes('item_secondary_title') &&
				titleRe.test(getTextContent(node).trim()) &&
				!foundTableTitleNodes.has(node)
			)
		})
		if (!foundTitle) {
			if (foundTableTitleNodes.size === 0) throw new Error('can not found table header on page')
			break
		}
		foundTableTitleNodes.add(foundTitle.node)

		const parent = mustBeDefined(foundTitle.ancestors.at(-1))
		const titleIndex = parent.children.indexOf(foundTitle.node)

		const foundTable = searchNode(
			parent.children[titleIndex + 1],
			node => isNode(node) && node.tag === 'table',
		)
		if (!foundTable) throw new Error('can not found table on page')

		const rows = mustBeNode(foundTable.node).children
		const header = headerFunc(mustBeNode(mustBeDefined(rows.shift())))

		const rowSpans = /**@type {(number|undefined)[]}*/ ([])

		for (let i = 0; i < rows.length; i++) {
			const origCells = mustBeNode(rows[i]).children.filter(isNode)
			const cells = withDummyCells(origCells, rowSpans)

			const rowRes = rowFunc(cells, header, i)
			if (rowRes !== null) res.push(rowRes)

			updateRowSpans(cells, rowSpans)
		}
	}
	return res
}

export const DUMMY_NODE = /**@type {import('#lib/xml').Node}*/ ({ tag: '', attrs: {}, children: [] })
/**
 * @param {import('#lib/xml').Node[]} cells
 * @param {(number|undefined)[]} rowSpans
 */
function withDummyCells(cells, rowSpans) {
	cells = cells.slice()
	for (let i = 0; i < cells.length; i++) {
		const colSpan = parseInt(cells[i].attrs['colspan'])
		if (!isNaN(colSpan))
			for (let j = 0; j < colSpan - 1; j++) {
				cells.splice(++i, 0, DUMMY_NODE)
			}
	}
	for (let i = 0; i < rowSpans.length; i++) {
		const rowSpan = rowSpans[i]
		if (rowSpan !== undefined && rowSpan > 0) {
			cells.splice(i, 0, DUMMY_NODE)
		}
	}
	return cells
}
/**
 * @param {import('#lib/xml').Node[]} cells
 * @param {(number|undefined)[]} rowSpans
 */
function updateRowSpans(cells, rowSpans) {
	for (let i = 0; i < rowSpans.length; i++) {
		const rowSpan = rowSpans[i]
		if (rowSpan !== undefined && rowSpan > 0) rowSpans[i] = rowSpan - 1
	}
	for (let i = 0; i < cells.length; i++) {
		const rowSpan = cells[i].attrs['rowspan']
		if (rowSpan) rowSpans[i] = parseInt(rowSpan) - 1
	}
}

/**
 * @template {Record<string, {name:string}>} T
 * @param {Map<string, T>} langMap
 * @param {(name:string) => string} codeFunc
 * @param {(code:string, item:T) => unknown} itemFunc
 */
export function forEachSortedLangItem(langMap, codeFunc, itemFunc) {
	const items = /**@type {[string, T][]}*/ ([])
	langMap.forEach((item, id) => items.push([codeFunc(item.en.name), item]))
	items.sort((a, b) => a[0].localeCompare(b[0])).forEach(([code, item]) => itemFunc(code, item))
}

/**
 * @param {import('#lib/xml').NodeOrText[]} cells
 * @param {RegExp} re
 */
export function mustFindCellIndex(cells, re) {
	const index = cells.findIndex(x => re.test(getTextContent(x).trim()))
	if (index === -1) throw new Error(`can not find column '${re}'`)
	return index
}

/**
 * @param {import('#lib/xml').Node} nameCell
 * @param {RegExp} aHrefIdRe
 * @param {number} rowIndex
 * @returns
 */
export function mustGetIdAndName(nameCell, aHrefIdRe, rowIndex) {
	const foundA = searchNode(nameCell, x => isNode(x) && x.tag === 'a')
	if (!foundA) throw new Error(`can not find <a> in name cell of row #${rowIndex + 1}`)

	const m = (mustBeNode(foundA.node).attrs.href ?? '').match(aHrefIdRe)
	if (!m) throw new Error(`can not get id from <a>.href in name cell of row #${rowIndex + 1}`)

	const id = m[1]
	return { id, name: getTextContent(nameCell).trim() }
}

/**
 * @param {import('#lib/xml').Node} iconCell
 * @param {number} rowIndex
 * @returns
 */
export function mustGetImgUrl(iconCell, rowIndex) {
	const foundImg = searchNode(iconCell, x => isNode(x) && x.tag === 'img')
	if (!foundImg) throw new Error(`can not find <img> in icon cell of row #${rowIndex + 1}`)

	const src = mustBeNode(foundImg.node).attrs['data-src'] ?? ''
	const m = src.match(/^(.*)_(\d+)_\d+\.png/)
	if (!m) throw new Error(`can not get id from img.data-src='${src}' in icon cell of row #${rowIndex + 1}`)
	const [, prefix, id] = m

	return `${ORIGIN}${prefix}_${id}.png`
}

/**
 * @param {number} val
 * @returns {import('#lib/genshin').GI_RarityCode}
 */
export function checkedRarity(val) {
	for (const code of GI_RARITY_CODES) if (code === val) return val
	/** @type {import('#lib/genshin').GI_RarityCode} */
	const fixed = val > 5 ? 5 : 1
	warn(`wrong rarity '${val}', using '${fixed}'`)
	return fixed
}

/**
 * @template {{id:string, name:string}} TItem
 * @param {Map<string, Record<string,TItem>>} map
 * @param {string} lang
 * @param {TItem[]} items
 */
export function addLangItems(map, lang, items) {
	for (const item of items) {
		const cur = map.get(item.id)
		if (cur) cur[lang] = item
		else map.set(item.id, { [lang]: item })
	}
}
/**
 * @template {{id:string, name:string}} TItem
 * @param {Map<string, Record<string,TItem>>} map
 * @param {string} lang
 * @param {TItem} item
 */
export function addLangItem(map, lang, item) {
	const cur = map.get(item.id)
	if (cur) cur[lang] = item
	else map.set(item.id, { [lang]: item })
}

/**
 * @template T
 * @template {keyof T} TAttr
 * @param {Record<string,T>} item
 * @param {TAttr} attr
 * @returns {Record<string, T[TAttr]>}
 */
export function makeLangMap(item, attr) {
	const res = /** @type {Record<string, T[TAttr]>} */ ({})
	for (const lang in item) res[lang] = item[lang][attr]
	return res
}

/**
 * @template T
 * @template {keyof T} TAttr
 * @param {Record<string,T>} item
 * @param {TAttr} attr
 * @returns {T[TAttr]}
 */
export function ensureSame(item, attr) {
	let res = /**@type {T[TAttr]|undefined}*/ (undefined)
	for (const lang in item) {
		const newVal = item[lang][attr]
		if (res !== undefined && res !== newVal)
			warn(`'${attr}' is different for different langs: ${res} != ${newVal}`)
		res = newVal
	}
	if (res === undefined) throw new Error(`empty lang '${attr}' values`)
	return res
}
