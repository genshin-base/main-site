import { createReadStream, promises as fs } from 'fs'
import { getArtifactCodeFromName, getCharacterCodeFromName, getWeaponCodeFromName } from '#lib/genshin.js'
import { getFileCached } from '#lib/requests.js'
import { getTextContent, isNode, mustBeNode, parseXmlStream, searchNode } from '#lib/xml.js'
import { mustBeDefined, warn } from '#lib/utils.js'
import { mediaChain, optipng, pngquant, resize } from '#lib/media.js'

const fixes = {
	// предметы почему-то находится в таблице нерелизнутого
	actuallyReleased: {
		bow: ['Predator', "Mouun's Moon"],
	},
}

const ORIGIN = 'https://genshin.honeyhunterworld.com'

/** @typedef {Map<string,Record<string,string>>} HoneyId2LangNames */

/** @typedef {Map<string,string>} Code2ImageUrl */

/** @template T @typedef {Map<string,Record<string,T>>} IdLangMap */

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<import('#lib/parsing').ItemsLangNames>}
 */
export async function extractCharactersLangNames(cacheDir, langs) {
	const id2character = /**@type {IdLangMap<{id:string, name:string}>}*/ (new Map())

	for (const lang of langs) {
		const cNames = await getCharacterNames(cacheDir, lang)
		addNames(cNames, id2character, lang)
	}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	for (const art of id2character.values()) {
		const code = getCharacterCodeFromName(art.en.name)
		langNames[code] = makeLangMap(art, 'name')
	}
	return langNames
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<{langNames:import('#lib/parsing').ItemsLangNames, imgs:Code2ImageUrl}>}
 */
export async function extractArtifactsData(cacheDir, langs) {
	const id2artifact = /**@type {IdLangMap<{id:string, name:string, img:string}>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('artifact', cacheDir, lang)
		const items = await mapTableRows(
			root,
			/(?: Sets|Uncategorized)$/i,
			header => ({
				icon: mustFindCellIndex(header.children, /^icon$/i),
				name: mustFindCellIndex(header.children, /^set name$/i),
			}),
			(cells, colIndex, rowIndex) => {
				const iconCell = cells[colIndex.icon]
				const nameCell = cells[colIndex.name]
				if (nameCell === DUMMY_NODE) return null

				return {
					...mustGetIdAndName(nameCell, /\/a_(\d+)/, rowIndex),
					img: mustGetImgUrl(iconCell, rowIndex),
				}
			},
		)
		addNames(items, id2artifact, lang)
	}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	const imgs = new Map()
	for (const art of id2artifact.values()) {
		const code = getArtifactCodeFromName(art.en.name)
		langNames[code] = makeLangMap(art, 'name')
		imgs.set(code, ensureSame(art, 'img'))
	}
	return { langNames, imgs }
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<import('#lib/parsing').ItemsLangNames>}
 */
export async function extractWeaponsLangNames(cacheDir, langs) {
	const id2weapon = /**@type {IdLangMap<{id:string, name:string}>} */ (new Map())
	const id2upcoming = /**@type {IdLangMap<{id:string, name:string}>} */ (new Map())

	for (const lang of langs) {
		/**
		 * @param {import('#lib/xml').Node} root
		 * @param {RegExp} titleRe
		 */
		function getNames(root, titleRe) {
			return mapTableRows(
				root,
				titleRe,
				header => mustFindCellIndex(header.children, /^name$/i),
				(cells, nameColIndex, rowIndex) => {
					const nameCell = cells[nameColIndex]
					if (nameCell === DUMMY_NODE) return null
					return mustGetIdAndName(nameCell, /\/w_(\d+)/, rowIndex)
				},
			)
		}
		for (const type of 'sword claymore polearm bow catalyst'.split(' ')) {
			const root = await getHoneyPage('weapon/' + type, cacheDir, lang)
			addNames(await getNames(root, /^Released .* Weapons$/i), id2weapon, lang)
			addNames(await getNames(root, /Upcoming\sWeapons$/i), id2upcoming, lang)
		}
	}
	for (const [id, weapon] of id2upcoming.entries())
		if (fixes.actuallyReleased.bow.includes(weapon.en.name)) {
			id2weapon.set(id, weapon)
		}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	for (const art of id2weapon.values()) {
		const code = getWeaponCodeFromName(art.en.name)
		langNames[code] = makeLangMap(art, 'name')
	}
	return langNames
}

/**
 * @param {Code2ImageUrl} imgs
 * @param {string} cacheDir
 * @param {string} cacheGroup
 * @param {(code:string) => string} fpathFunc
 */
export async function getAndProcessItemImages(imgs, cacheDir, cacheGroup, fpathFunc) {
	const imgsCacheDir = `${cacheDir}/honeyhunter/imgs/${cacheGroup}`
	await fs.mkdir(imgsCacheDir, { recursive: true })

	for (const [code, url] of imgs.entries()) {
		const fpath = fpathFunc(code)
		const cacheFPath = `${imgsCacheDir}/${code}.png`

		try {
			await getFileCached(url, null, cacheFPath, false, Infinity)
		} catch (ex) {
			warn(`can not get image for '${code}' artifact: ${ex}`)
			continue
		}

		await mediaChain(cacheFPath, fpath, (i, o) => resize(i, o, '64x64'), optipng, pngquant)
	}
}

/**
 * @template {{id:string, name:string}} TItem
 * @param {TItem[]} items
 * @param {Map<string, Record<string,TItem>>} map
 * @param {string} lang
 */
function addNames(items, map, lang) {
	for (const item of items) {
		const cur = map.get(item.id)
		if (cur) cur[lang] = item
		else map.set(item.id, { [lang]: item })
	}
}

/**
 * @template T
 * @param {Record<string,T>} item
 * @param {keyof T} attr
 * @returns {Record<string, T[attr]>}
 */
function makeLangMap(item, attr) {
	const res = /** @type {Record<string, T[attr]>} */ ({})
	for (const lang in item) res[lang] = item[lang][attr]
	return res
}

/**
 * @template T
 * @param {Record<string,T>} item
 * @param {keyof T} attr
 * @returns {T[attr]}
 */
function ensureSame(item, attr) {
	let res = /**@type {T[attr]|undefined}*/ (undefined)
	for (const lang in item) {
		const newVal = item[lang][attr]
		if (res !== undefined && res !== newVal)
			warn(`'${attr}' is different for different langs: ${res} != ${newVal}`)
		res = newVal
	}
	if (res === undefined) throw new Error('empty lang values')
	return res
}

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @returns {Promise<import('#lib/xml').Node>}
 */
async function getHoneyPage(path, cacheDir, lang) {
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
async function mapTableRows(root, titleRe, headerFunc, rowFunc) {
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

/**
 * @param {import('#lib/xml').Node} nameCell
 * @param {RegExp} aHrefIdRe
 * @param {number} rowIndex
 * @returns
 */
function mustGetIdAndName(nameCell, aHrefIdRe, rowIndex) {
	const foundA = searchNode(nameCell, x => isNode(x) && x.tag === 'a')
	if (!foundA) throw new Error(`can not find <a> in name cell of row #${rowIndex + 1}`)

	const m = (mustBeNode(foundA.node).attrs.href ?? '').match(aHrefIdRe)
	if (!m) throw new Error(`can not get id from a.href in name cell of row #${rowIndex + 1}`)

	const id = m[1]
	return { id, name: getTextContent(nameCell).trim() }
}

/**
 * @param {import('#lib/xml').Node} iconCell
 * @param {number} rowIndex
 * @returns
 */
function mustGetImgUrl(iconCell, rowIndex) {
	const foundImg = searchNode(iconCell, x => isNode(x) && x.tag === 'img')
	if (!foundImg) throw new Error(`can not find <img> in icon cell of row #${rowIndex + 1}`)

	const src = mustBeNode(foundImg.node).attrs['data-src'] ?? ''
	const m = src.match(/^(.*)_(\d+)_50\.png/)
	if (!m) throw new Error(`can not get id from img.data-src='${src}' in icon cell of row #${rowIndex + 1}`)
	const [, prefix, id] = m

	return `${ORIGIN}${prefix}_${id}.png`
}

const DUMMY_NODE = /**@type {import('#lib/xml').Node}*/ ({ tag: '', attrs: {}, children: [] })
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
 * @param {import('#lib/xml').NodeOrText[]} cells
 * @param {RegExp} re
 */
function mustFindCellIndex(cells, re) {
	const index = cells.findIndex(x => re.test(getTextContent(x).trim()))
	if (index === -1) throw new Error(`can not find column '${re}'`)
	return index
}

/**
 * @param {string} cacheDir
 * @param {string} lang
 * @returns {Promise<{id:string, name:string}[]>}
 */
async function getCharacterNames(cacheDir, lang) {
	const root = await getHoneyPage('char/characters', cacheDir, lang)
	const res = []

	searchNode(root, (node, ancestors) => {
		if (isNode(node) && node.attrs.class?.includes('sea_charname')) {
			const href = mustBeDefined(ancestors.at(-1)).attrs.href ?? ''
			const m = href.match(/\/char\/([^/]+)/)
			if (!m) throw new Error(`can not get character id from a.href '${href}'`)
			const id = m[1]
			res.push({ id, name: getTextContent(node) })
		}
		return false
	})

	return res
}
