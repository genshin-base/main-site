import { createReadStream, promises as fs } from 'fs'
import { GI_ELEMENT_CODES, GI_RARITY_CODES, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { mustBeDefined, simpleDeepEqual } from '#lib/utils/values.js'
import { progress, warn, info } from '#lib/utils/logs.js'
import {
	getTextContent,
	isNode,
	mustBeNode,
	nodeHasClass,
	parseXmlStream,
	parseXmlString,
	queryNodes,
	searchNode,
	searchNodeNodes,
	searchNodeWithClass,
	searchNodeWithTag,
} from '#lib/xml.js'
import { getFileCached } from '#lib/requests.js'
import { ART_SET_ID_VARIANT_PREFIX } from './artifacts.js'
import { URLSearchParams } from 'url'

const ORIGIN = 'https://genshin.honeyhunterworld.com'

/** @template T @typedef {Map<string,Record<string,T>>} IdLangMap */

/** @typedef {Map<string,string>} Code2ImageUrl */

let versionPageParamCache = /**@type {string|null}*/ (null)

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @param {boolean} [canRedirect]
 * @returns {Promise<import('#lib/xml').Node>}
 */
export async function getHoneyPage(path, cacheDir, lang, canRedirect = false) {
	versionPageParamCache ??= await getPageLatestVersion(cacheDir)
	return getHoneyPageInner(path, cacheDir, lang, versionPageParamCache, canRedirect)
}
/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @param {string|null} version
 * @param {boolean} canRedirect
 * @returns {Promise<import('#lib/xml').Node>}
 */
async function getHoneyPageInner(path, cacheDir, lang, version, canRedirect) {
	await fs.mkdir(`${cacheDir}/honeyhunter`, { recursive: true })

	if (path !== '') path += '/'
	const url = `${ORIGIN}/${path}`
	const fpath = `${cacheDir}/honeyhunter/${path.replace(/\//g, '-')}-${lang}.html`
	const data = { lang: lang.toLocaleUpperCase(), ...(version === null ? {} : { ver: version }) }
	const cacheUsed = await getFileCached(url, data, fpath, canRedirect, Infinity)

	if (!cacheUsed) await fixInvalidHtml(fpath)
	if (!cacheUsed) progress()
	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}
/**
 * @param {string} cacheDir
 */
async function getPageLatestVersion(cacheDir) {
	const root = await getHoneyPageInner('', cacheDir, 'en', null, false)
	for (const node of queryNodes(root, '.version_selector option')) {
		if (getTextContent(node).trim() === 'Latest Live') {
			const version = new URLSearchParams(node.attrs['value'] ?? '').get('ver')
			if (version === null) break
			info(`honeyhunter: latest version: ${version}`)
			return version
		}
	}
	warn('honeyhunter: can not get the latest version from the main page, using blank value')
	return ''
}

/** @param {string} fpath */
async function fixInvalidHtml(fpath) {
	// На некоторых страницах honeyhunter'а поломана вёрстка (пропущены открывающие/закрывающие теги).
	// Браузер это кое-как исправляет до рабочего состояния.
	// htmlparser2 ничего не исправляет, но работает проще и быстрее.
	// parse5 исправляет браузероподобно (вроде бы), но работает дольше и результат даёт в не совсем подходящем виде.
	// Так что прогоняем пока свежескачанные файлы через этот parse5 и кладём в кеш. Потом ими займётся htmlparser2.
	const parse5 = await import('parse5')
	const text = await fs.readFile(fpath, { encoding: 'utf-8' })
	const doc = parse5.parse(text)
	;(function clean(nodes) {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i]
			if ('childNodes' in node) clean(node.childNodes)
		}
	})(doc.childNodes)
	const fixedText = parse5.serialize(doc)
	await fs.writeFile(fpath, fixedText)
}

/**
 * @param {import('#lib/xml').Node} root
 * @param {RegExp} titleRe
 * @param {'main-table'|'section-table'} tableType
 * @returns {{
 *   colTitle2index: Map<string,number>,
 *   mustGetColIndex(title:string): number,
 *   tableWrap: import('#lib/xml').Node,
 *   table: import('#lib/xml').Node,
 * }}
 */
export function mustGetJSTable(root, titleRe, tableType) {
	const titleClass = tableType === 'main-table' ? 'wp-block-post-title' : 'delim'
	const foundTitle = searchNodeWithClass(root, titleClass, (node, ancestors) => {
		return titleRe.test(getTextContent(node).trim())
	})
	if (!foundTitle) throw new Error(`can not find table title by ${titleRe}`)

	const parent = mustBeDefined(foundTitle.ancestors.at(-1))
	const titleIndex = parent.children.indexOf(foundTitle.node)
	const tableWrap = parent.children
		.slice(titleIndex + 1)
		.filter(isNode)
		.find(x => !nodeHasClass(x, 'sort_panel'))
	const foundTable = tableWrap && searchNodeWithTag(tableWrap, 'table', () => true)
	if (!foundTable) throw new Error(`can not find table after title '${getTextContent(foundTitle.node)}'`)

	const { colTitle2index, mustGetColIndex } = mustParseJSTableHeder(foundTable.node)
	return { colTitle2index, mustGetColIndex, tableWrap, table: foundTable.node }
}
/**
 * @param {import('#lib/xml').Node} root
 * @param {RegExp} titleRe
 * @param {'main-table'|'section-table'} tableType
 * @returns {{
 *   colTitle2index: Map<string,number>,
 *   mustGetColIndex(title:string): number,
 *   rows: import('#lib/xml').Node[][],
 * }}
 */
export function mustGetJSTableRows(root, titleRe, tableType) {
	const { colTitle2index, mustGetColIndex, table } = mustGetJSTable(root, titleRe, tableType)
	const rows = mustParsesJSTableScriptRows(table)
	return { colTitle2index, mustGetColIndex, rows }
}
/**
 * @param {import('#lib/xml').Node} tableNode
 * @returns {{
 *   colTitle2index: Map<string,number>,
 *   mustGetColIndex(title:string): number,
 * }}
 */
export function mustParseJSTableHeder(tableNode) {
	const colTitle2index = /**@type {Map<string,number>}*/ (new Map())
	searchNodeWithTag(tableNode, 'tr', (node, ancestors) => {
		for (let i = 0; i < node.children.length; i++)
			colTitle2index.set(getTextContent(node.children[i]).trim(), i)
		return true
	})
	function mustGetColIndex(/**@type {string}*/ name) {
		const index = colTitle2index.get(name)
		if (index === undefined)
			throw new Error(`column '${name}' not found, available: ${[...colTitle2index.keys()]}`)
		return index
	}
	return { colTitle2index, mustGetColIndex }
}
/**
 * @param {import('#lib/xml').Node} tableNode
 * @returns {import('#lib/xml').Node[][]}
 */
export function mustParsesJSTableScriptRows(tableNode) {
	const found = searchNodeWithTag(tableNode, 'script', (node, ancestors) => {
		return getTextContent(node).trimStart().startsWith('sortable_data.push')
	})
	if (!found) throw new Error('<script> with table data not found')

	const m = getTextContent(found.node).match(/\[\[.*\]\]/)
	if (!m) throw new Error('wrong sortable_data')
	return JSON.parse(m[0]).map(cells => cells.map(str => parseXmlString(str)))
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
 * @param {string} [errPrefix]
 */
export function mustGetImgUrl(iconCell, errPrefix) {
	errPrefix = errPrefix === undefined ? '' : errPrefix + ': '

	const foundImg = searchNode(iconCell, x => isNode(x) && x.tag === 'img')
	if (!foundImg) throw new Error(`${errPrefix}can not find <img> in icon cell`)

	const src = mustBeNode(foundImg.node).attrs['src'] ?? ''
	const m = src.match(/^(.*?)_(n?\d+)(?:_\d+)?\.webp/)
	// console.log(m?.slice(1), src)
	if (!m) throw new Error(`${errPrefix}can not get id from img.src='${src}' in icon cell`)
	const [, prefix, id] = m

	return `${ORIGIN}${prefix}_${id}.png`
}

/**
 * @param {string} href
 * @param {Map<string,import('#lib/parsing').ItemData>} id2item
 * @param {Map<string,import('#lib/parsing').ArtifactSetData>} id2artSet
 * @returns {['item', import('#lib/parsing').ItemData] | ['artSet', import('#lib/parsing').ArtifactSetData]}
 */
export function mustGetItemOrArtSet(href, id2item, id2artSet) {
	const m = href.match(/\/i_(n?\d+)/)
	if (m !== null) {
		const item = id2item.get(m[1])
		if (item) return ['item', item]
		const artSet = id2artSet.get(ART_SET_ID_VARIANT_PREFIX + m[1])
		if (artSet) return ['artSet', artSet]
	}
	throw new Error(`unexteped item/artifact href="${href}"`)
}
/**
 * @param {string} href
 * @param {Map<string,import('#lib/parsing').ItemData>} id2item
 * @returns {import('#lib/parsing').ItemData}
 */
export function mustGetItem(href, id2item) {
	let m
	if ((m = href.match(/\/i_(n?\d+)/)) !== null) {
		const item = id2item.get(m[1])
		if (!item) throw new Error(`unknown item #${m[1]}`)
		return item
	} else {
		throw new Error(`unexteped item href="${href}"`)
	}
}

/**
 * @param {import('#lib/xml').NodeOrText} root
 * @param {string|null} wrapClass
 * @param {string} starItemClass
 * @param {false|'max'} aggregate
 * @returns {import('#lib/genshin').GI_RarityCode}
 */
export function mustCountRarityStars(root, wrapClass, starItemClass, aggregate) {
	const rarities = []
	searchNodeNodes(root, node => {
		if (wrapClass === null || nodeHasClass(node, wrapClass)) {
			let rarity = 0
			searchNodeNodes(node, x => {
				if (nodeHasClass(x, starItemClass)) {
					rarity++
					return 'skip-children'
				}
				return false
			})
			rarities.push(rarity)
			return aggregate === false ? true : 'skip-children'
		}
		return false
	})
	if (rarities.length === 0) throw new Error(`can not find rarity stars wrap elem '${wrapClass}'`)
	return checkedRarity(aggregate === 'max' ? Math.max(...rarities) : rarities[0])
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
 * @param {string} code
 * @param {string} logPrefix
 * @returns {import('#lib/genshin').GI_ElementCode}
 */
export function checkedElementCode(code, logPrefix) {
	if (GI_ELEMENT_CODES.includes(/**@type {*}*/ (code)))
		return /**@type {import('#lib/genshin').GI_ElementCode}*/ (code)
	const def = 'anemo'
	warn(`${logPrefix}: wrong element '${code}', using '${def}'`)
	return def
}

/**
 * @param {string} code
 * @param {string} logPrefix
 * @returns {import('#lib/genshin').GI_WeaponTypeCode}
 */
export function checkedWeaponTypeCode(code, logPrefix) {
	if (GI_WEAPON_TYPE_CODES.includes(/**@type {*}*/ (code)))
		return /**@type {import('#lib/genshin').GI_WeaponTypeCode}*/ (code)
	const def = 'claymore'
	warn(`${logPrefix}: wrong weapon type '${code}', using '${def}'`)
	return def
}

/**
 * @template {{id:string}} TItem
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
 * @template {{id:string}} TItem
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
 * @template {(keyof T) & string} TAttr
 * @param {Record<string,T>} item
 * @param {TAttr} attr
 * @returns {T[TAttr]}
 */
export function ensureSame(item, attr) {
	let res = /**@type {T[TAttr]|undefined}*/ (undefined)
	for (const lang in item) {
		const newVal = item[lang][attr]
		if (res !== undefined && !simpleDeepEqual(res, newVal))
			warn(`'${attr}' is different for different langs: ${res} != ${newVal}`)
		res = newVal
	}
	if (res === undefined) throw new Error(`empty lang '${attr}' values`)
	return res
}
