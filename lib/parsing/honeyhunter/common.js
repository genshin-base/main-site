import { createReadStream, promises as fs } from 'fs'
import { GI_ELEMENT_CODES, GI_RARITY_CODES, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { mustBeDefined, simpleDeepEqual } from '#lib/utils/values.js'
import { progress, warn } from '#lib/utils/logs.js'
import {
	forEachTBodyRow,
	getTextContent,
	isNode,
	mustBeNode,
	nodeHasClass,
	parseXmlStream,
	searchNode,
	searchNodeNodes,
} from '#lib/xml.js'
import { getFileCached } from '#lib/requests.js'

const ORIGIN = 'https://genshin.honeyhunterworld.com'

/** @template T @typedef {Map<string,Record<string,T>>} IdLangMap */

/** @typedef {Map<string,string>} Code2ImageUrl */

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @param {boolean} [canRedirect]
 * @returns {Promise<import('#lib/xml').Node>}
 */
export async function getHoneyPage(path, cacheDir, lang, canRedirect = false) {
	await fs.mkdir(`${cacheDir}/honeyhunter`, { recursive: true })

	const url = `${ORIGIN}/db/${path}/`
	const fpath = `${cacheDir}/honeyhunter/${path.replace(/\//g, '-')}-${lang}.html`
	const data = { lang: lang.toLocaleUpperCase() }
	const cacheUsed = await getFileCached(url, data, fpath, canRedirect, Infinity)

	if (!cacheUsed) await fixInvalidHtml(fpath)
	if (!cacheUsed) progress()
	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}

/** @param {string} fpath */
async function fixInvalidHtml(fpath) {
	// На некоторых страницах honeyhunter'а поломана вёрстка (пропущены открывающие/закрывающие теги).
	// Браузер это кое-как исправляет до рабочего состояния.
	// htmlparser2 ничего не исправляет, но работает проще и быстрее.
	// parse5 исправляет браузероподобно (вроде бы), но работает дольше и результат даёт в не совсем подходящем виде.
	// Так что прогоняем пока всежескачанные файлы через этот parse5 и кладём в кеш. Потом ими займётся htmlparser2.
	const parse5 = await import('parse5')
	const text = await fs.readFile(fpath, { encoding: 'utf-8' })
	const doc = parse5.parse(text)
	;(function clean(nodes) {
		for (let i = 0; i < nodes.length; i++) {
			const node = nodes[i]
			if (node.nodeName === 'script') nodes.splice(i--, 1)
			else if ('childNodes' in node) clean(node.childNodes)
		}
	})(doc.childNodes)
	const fixedText = parse5.serialize(doc)
	await fs.writeFile(fpath, fixedText)
}

/**
 * @param {import('#lib/xml').Node} root
 * @param {RegExp} titleRe
 * @param {(node:import('#lib/xml').Node) => boolean} [extraTileFilterFunc]
 * @returns {[title:null, body:null]
 *   |[title:import('#lib/xml').Node, body:null]
 *   |[title:import('#lib/xml').Node, body:import('#lib/xml').Node]}
 */
export function findTable(root, titleRe, extraTileFilterFunc) {
	const foundTitle = searchNodeNodes(root, (node, ancestors) => {
		return (
			nodeHasClass(node, 'item_secondary_title') &&
			titleRe.test(getTextContent(node).trim()) &&
			(!extraTileFilterFunc || extraTileFilterFunc(node))
		)
	})
	if (!foundTitle) return [null, null]

	const parent = mustBeDefined(foundTitle.ancestors.at(-1))
	const titleIndex = parent.children.indexOf(foundTitle.node)

	const foundTBody = searchNodeNodes(parent.children[titleIndex + 1], node => node.tag === 'tbody')

	return [foundTitle.node, foundTBody?.node ?? null]
}

/**
 * @template THead
 * @template TRes
 * @param {import('#lib/xml').Node} root
 * @param {RegExp} titleRe
 * @param {((headerCells:import('#lib/xml').Node[]) => THead)|null} headerFunc
 *   если функция не задана, первая строка таблицы считается строкой тела и попадает в `rowFunc`
 * @param {(cells:import('#lib/xml').Node[], header:THead, rowIndex:number) => TRes|null} rowFunc
 * @returns {TRes[]}
 */
export function mapTableRows(root, titleRe, headerFunc, rowFunc) {
	const res = []

	const foundTableTitleNodes = new Set()
	while (true) {
		const [titleNode, tbodyNode] = findTable(root, titleRe, node => !foundTableTitleNodes.has(node))
		if (!titleNode) {
			if (foundTableTitleNodes.size === 0)
				throw new Error('can not find table header on page by ' + titleRe)
			break
		}
		foundTableTitleNodes.add(titleNode)

		if (!tbodyNode) throw new Error('can not find <tbody> on page after ' + titleRe)

		let header
		forEachTBodyRow(tbodyNode, (row, cells, rowIndex) => {
			if (rowIndex === 0 && headerFunc) {
				header = headerFunc(row.children.filter(isNode))
			} else {
				const rowRes = rowFunc(cells, header, rowIndex - (headerFunc ? 1 : 0))
				if (rowRes !== null) res.push(rowRes)
			}
		})
	}
	return res
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

	const src = mustBeNode(foundImg.node).attrs['data-src'] ?? ''
	const m = src.match(/^(.*)_n?(\d+)_\d+\.png/)
	if (!m) throw new Error(`${errPrefix}can not get id from img.data-src='${src}' in icon cell`)
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
	let m
	if ((m = href.match(/\/db\/item\/i_(\d+)/)) !== null) {
		const item = id2item.get(m[1])
		if (!item) throw new Error(`unknown item #${m[1]}`)
		return ['item', item]
	} else if ((m = href.match(/\/db\/art\/family\/a_(\d+)/)) !== null) {
		const artSet = id2artSet.get(m[1])
		if (!artSet) throw new Error(`unknown artifact set #${m[1]}`)
		return ['artSet', artSet]
	} else {
		throw new Error(`unexteped item/artifact href="${href}"`)
	}
}
/**
 * @param {string} href
 * @param {Map<string,import('#lib/parsing').ItemData>} id2item
 * @returns {import('#lib/parsing').ItemData}
 */
export function mustGetItem(href, id2item) {
	let m
	if ((m = href.match(/\/db\/item\/i_n?(\d+)/)) !== null) {
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
 * @template {keyof T} TAttr
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
