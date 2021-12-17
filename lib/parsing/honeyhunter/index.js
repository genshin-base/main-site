import { createReadStream, promises as fs } from 'fs'
import { getArtifactCodeFromName, getCharacterCodeFromName, getWeaponCodeFromName } from '#lib/genshin.js'
import { getFileCached } from '#lib/requests.js'
import { getTextContent, isNode, mustBeNode, parseXmlStream, searchNode } from '#lib/xml.js'
import { mustBeDefined } from '#lib/utils.js'

const fixes = {
	// предметы почему-то находится в таблице нерелизнутого
	actuallyReleased: {
		bow: ['Predator', "Mouun's Moon"],
	},
}

/** @typedef {Map<string,Record<string,string>>} HoneyId2LangNames */

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<import('#lib/parsing').ItemsLangNames>}
 */
export async function extractCharactersLangNames(cacheDir, langs) {
	const id2character = new Map()

	for (const lang of langs) {
		const cNames = await getCharacterNames(cacheDir, lang)
		addNames(cNames, id2character, lang)
	}

	return idMap2codeRecord(id2character, getCharacterCodeFromName)
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<import('#lib/parsing').ItemsLangNames>}
 */
export async function extractArtifactsLangNames(cacheDir, langs) {
	const id2artifact = new Map()

	for (const lang of langs) {
		const aNames = await getNamesFromTable(
			'artifact',
			cacheDir,
			lang,
			/(?: Sets|Uncategorized)$/i,
			/^set name$/i,
			/\/a_(\d+)/,
		)
		addNames(aNames, id2artifact, lang)
	}

	return idMap2codeRecord(id2artifact, getArtifactCodeFromName)
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @returns {Promise<import('#lib/parsing').ItemsLangNames>}
 */
export async function extractWeaponsLangNames(cacheDir, langs) {
	const id2weapon = /**@type {HoneyId2LangNames} */ (new Map())
	const id2upcoming = /**@type {HoneyId2LangNames} */ (new Map())

	for (const lang of langs) {
		/**
		 * @param {string} type
		 * @param {RegExp} titleRe
		 */
		function getNames(type, titleRe) {
			return getNamesFromTable('weapon/' + type, cacheDir, lang, titleRe, /^name$/i, /\/w_(\d+)/)
		}
		for (const type of 'sword claymore polearm bow catalyst'.split(' ')) {
			addNames(await getNames(type, /^Released .* Weapons$/i), id2weapon, lang)
			addNames(await getNames(type, /Upcoming\sWeapons$/i), id2upcoming, lang)
		}
	}
	for (const [id, names] of id2upcoming.entries())
		if (fixes.actuallyReleased.bow.includes(names['en'])) {
			id2weapon.set(id, names)
		}

	return idMap2codeRecord(id2weapon, getWeaponCodeFromName)
}

/**
 * @param {{id:string, name:string}[]} names
 * @param {HoneyId2LangNames} map
 * @param {string} lang
 */
function addNames(names, map, lang) {
	for (const { id, name } of names) {
		const item = map.get(id)
		if (item) item[lang] = name
		else map.set(id, { [lang]: name })
	}
}
/**
 * @param {HoneyId2LangNames} id2names
 * @param {(name:string) => string} codeFunc
 * @returns {import('#lib/parsing').ItemsLangNames}
 */
function idMap2codeRecord(id2names, codeFunc) {
	const res = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	for (const names of id2names.values()) res[codeFunc(names.en)] = names
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
	const url = `https://genshin.honeyhunterworld.com/db/${path}/`
	const fpath = `${cacheDir}/honeyhunter/${path.replace(/\//g, '-')}-${lang}.html`
	await getFileCached(url, { lang: lang.toLocaleUpperCase() }, fpath, false, Infinity)
	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @param {RegExp} titleRe
 * @param {RegExp} nameColRe
 * @param {RegExp} aHrefIdRe
 * @returns {Promise<{id:string, name:string}[]>}
 */
async function getNamesFromTable(path, cacheDir, lang, titleRe, nameColRe, aHrefIdRe) {
	const root = await getHoneyPage(path, cacheDir, lang)
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
		const header = mustBeNode(mustBeDefined(rows.shift()))
		const nameColIndex = header.children.findIndex(x => nameColRe.test(getTextContent(x).trim()))
		if (nameColIndex === -1) throw new Error('can not find name column')

		const rowSpans = /**@type {(number|undefined)[]}*/ ([])

		for (const row of rows) {
			const origCells = mustBeNode(row).children.filter(isNode)
			const cells = withDummyCells(origCells, rowSpans)

			const nameCell = cells[nameColIndex]
			if (nameCell !== DUMMY_NODE) {
				// console.log(nameColIndex, rowSpans, mustBeNode(row).children)
				const foundA = searchNode(nameCell, x => isNode(x) && x.tag === 'a')
				if (!foundA) throw new Error(`can not fund <a> in name cell of row #${rows.indexOf(row)}`)
				const m = (mustBeNode(foundA.node).attrs.href ?? '').match(aHrefIdRe)
				if (!m)
					throw new Error(`can not get id from a.href in name cell of row #${rows.indexOf(row)}`)
				const id = m[1]
				// console.log(lang, id, getTextContent(nameCell))
				res.push({ id, name: getTextContent(nameCell).trim() })
			}

			updateRowSpans(cells, rowSpans)
		}
	}
	return res
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
