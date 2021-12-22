import { createReadStream, promises as fs } from 'fs'
import {
	getArtifactCodeFromName,
	getCharacterCodeFromName,
	getDomainCodeFromName,
	getWeaponCodeFromName,
	GI_WEAPON_TYPE_CODES,
} from '#lib/genshin.js'
import { getFileCached } from '#lib/requests.js'
import { getTextContent, isNode, mustBeNode, parseXmlStream, searchNode } from '#lib/xml.js'
import { mustBeDefined, warn } from '#lib/utils.js'
import { mediaChain, optipng, pngquant, resize } from '#lib/media.js'

const ORIGIN = 'https://genshin.honeyhunterworld.com'

/** @typedef {{type:string, name:Record<string,string>, location:[number, number]}} DomainInfo */
/** @typedef {Record<string,DomainInfo>} DomainsInfo */

/** @typedef {Map<string,Record<string,string>>} HoneyId2LangNames */

/** @typedef {Map<string,string>} Code2ImageUrl */

/** @template T @typedef {Map<string,Record<string,T>>} IdLangMap */

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<{langNames:import('#lib/parsing').ItemsLangNames, faceImgs:Code2ImageUrl}>}
 */
export async function extractCharactersData(cacheDir, langs) {
	const id2character = /**@type {IdLangMap<{id:string, name:string}>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('char/characters', cacheDir, lang)

		searchNode(root, (node, ancestors) => {
			if (isNode(node) && node.attrs.class?.includes('sea_charname')) {
				const href = mustBeDefined(ancestors.at(-1)).attrs.href ?? ''
				const m = href.match(/\/char\/([^/]+)/)
				if (!m) throw new Error(`can not get character id from <a>.href '${href}'`)
				const id = m[1]
				addLangItem(id2character, lang, { id, name: getTextContent(node) })
			}
			return false
		})
	}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	const faceImgs = new Map()
	for (const char of id2character.values()) {
		const code = getCharacterCodeFromName(char.en.name)
		langNames[code] = makeLangMap(char, 'name')

		const id = ensureSame(char, 'id')
		const faceImg = `https://genshin.honeyhunterworld.com/img/char/${id}_face.png`
		if (!faceImgs.has(code) || id === 'traveler_boy_anemo') faceImgs.set(code, faceImg)
	}
	return { langNames, faceImgs }
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{langNames:import('#lib/parsing').ItemsLangNames, imgs:Code2ImageUrl}>}
 */
export async function extractArtifactsData(cacheDir, langs, fixes) {
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
		addLangItems(id2artifact, lang, items)
	}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	const imgs = new Map()
	forEachSortedLangItem(id2artifact, getArtifactCodeFromName, (code, art) => {
		langNames[code] = makeLangMap(art, 'name')
		imgs.set(code, ensureSame(art, 'img'))
	})
	return { langNames, imgs }
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{langNames:import('#lib/parsing').ItemsLangNames, imgs:Code2ImageUrl}>}
 */
export async function extractWeaponsData(cacheDir, langs, fixes) {
	const id2weapon = /**@type {IdLangMap<{id:string, name:string, img:string}>} */ (new Map())
	const id2upcoming = /**@type {IdLangMap<{id:string, name:string, img:string}>} */ (new Map())

	for (const lang of langs) {
		/**
		 * @param {import('#lib/xml').Node} root
		 * @param {RegExp} titleRe
		 */
		function getNames(root, titleRe) {
			return mapTableRows(
				root,
				titleRe,
				header => ({
					icon: mustFindCellIndex(header.children, /^icon$/i),
					name: mustFindCellIndex(header.children, /^name$/i),
				}),
				(cells, colIndex, rowIndex) => {
					const iconCell = cells[colIndex.icon]
					const nameCell = cells[colIndex.name]
					if (nameCell === DUMMY_NODE) return null
					return {
						...mustGetIdAndName(nameCell, /\/w_(\d+)/, rowIndex),
						img: mustGetImgUrl(iconCell, rowIndex),
					}
				},
			)
		}
		for (const type of GI_WEAPON_TYPE_CODES) {
			const root = await getHoneyPage('weapon/' + type, cacheDir, lang)
			addLangItems(id2weapon, lang, await getNames(root, /^Released .* Weapons$/i))
			addLangItems(id2upcoming, lang, await getNames(root, /Upcoming\sWeapons$/i))
		}
	}
	for (const [id, weapon] of id2upcoming.entries()) {
		const fix = fixes.statuses.weapons.find(x => x.actually === 'released' && x.name === weapon.en.name)
		if (fix) {
			fix._used = true
			id2weapon.set(id, weapon)
		}
	}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	const imgs = new Map()
	forEachSortedLangItem(id2weapon, getWeaponCodeFromName, (code, weapon) => {
		langNames[code] = makeLangMap(weapon, 'name')
		imgs.set(code, ensureSame(weapon, 'img'))
	})
	return { langNames, imgs }
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<Record<string,DomainInfo>>}
 */
export async function extractDomainsData(cacheDir, langs, fixes) {
	const id2domain = /**@type {IdLangMap<{id:string, name:string, type:string}>}*/ (new Map())

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
	return domains
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

		await mediaChain(cacheFPath, fpath, (i, o) => resize(i, o, '64x64'), pngquant, optipng)
	}
}

/**
 * @template {{id:string, name:string}} TItem
 * @param {Map<string, Record<string,TItem>>} map
 * @param {string} lang
 * @param {TItem[]} items
 */
function addLangItems(map, lang, items) {
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
function addLangItem(map, lang, item) {
	const cur = map.get(item.id)
	if (cur) cur[lang] = item
	else map.set(item.id, { [lang]: item })
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
	if (res === undefined) throw new Error(`empty lang '${attr}' values`)
	return res
}

/**
 * @template {Record<string, {name:string}>} T
 * @param {Map<string, T>} langMap
 * @param {(name:string) => string} codeFunc
 * @param {(code:string, item:T) => unknown} itemFunc
 */
function forEachSortedLangItem(langMap, codeFunc, itemFunc) {
	const items = /**@type {[string, T][]}*/ ([])
	langMap.forEach((item, id) => items.push([codeFunc(item.en.name), item]))
	items.sort((a, b) => a[0].localeCompare(b[0])).forEach(([code, item]) => itemFunc(code, item))
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
	if (!m) throw new Error(`can not get id from <a>.href in name cell of row #${rowIndex + 1}`)

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
	const m = src.match(/^(.*)_(\d+)_\d+\.png/)
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
