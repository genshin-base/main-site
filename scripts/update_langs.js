#!/bin/node
import yaml from 'yaml'
import { createReadStream, promises as fs } from 'fs'
import { dirname } from 'path/posix'
import { fileURLToPath } from 'url'
import { getWeaponCodeFromName } from '../lib/parsing/weapons.js'
import { getFileCached } from '../lib/requests.js'
import { mustBeDefined } from '../lib/utils.js'
import { getTextContent, isNode, mustBeNode, parseXmlStream, searchNode } from '../lib/xml.js'
import { getArtifactCodeFromName } from '../lib/parsing/artifacts.js'
import { getCharacterCodeFromName } from '../lib/parsing/characters.js'

const LANGS = ['en', 'ru']

const __filename = fileURLToPath(import.meta.url)
const baseDir = dirname(__filename) + '/..'
const DATA_DIR = `${baseDir}/builds_data`
const CACHE_DIR = `${baseDir}/cache`

;(async () => {
	const id2weapon = new Map()
	const id2artifact = new Map()
	const id2character = new Map()

	for (const lang of LANGS) {
		const wNames = await getNamesFromTable(
			'weapon/claymore',
			lang,
			/^Released .* Weapons$/i,
			/^name$/i,
			/\/w_(\d+)/,
		)
		addNames(wNames, id2weapon, lang)

		const aNames = await getNamesFromTable(
			'artifact',
			lang,
			/(?: Sets|Uncategorized)$/i,
			/^set name$/i,
			/\/a_(\d+)/,
		)
		addNames(aNames, id2artifact, lang)

		const cNames = await getCharacterNames(lang)
		addNames(cNames, id2character, lang)
	}

	await fs.mkdir(DATA_DIR, { recursive: true })
	await fs.writeFile(
		`${DATA_DIR}/weapon_names.yaml`,
		yaml.stringify(idMap2codeRecord(id2weapon, getWeaponCodeFromName)),
	)
	await fs.writeFile(
		`${DATA_DIR}/artifact_names.yaml`,
		yaml.stringify(idMap2codeRecord(id2artifact, getArtifactCodeFromName)),
	)
	await fs.writeFile(
		`${DATA_DIR}/character_names.yaml`,
		yaml.stringify(idMap2codeRecord(id2character, getCharacterCodeFromName)),
	)
})().catch(console.error)

/**
 * @param {{id:string, name:string}[]} names
 * @param {Map<string,Record<string,string>>} map
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
 * @param {Map<string,Record<string,string>>} id2names
 * @param {(name:string) => string} codeFunc
 */
function idMap2codeRecord(id2names, codeFunc) {
	const res = {}
	for (const names of id2names.values()) res[codeFunc(names.en)] = names
	return res
}

/**
 * @param {string} path
 * @param {string} lang
 * @returns {Promise<import('../lib/xml').Node>}
 */
async function getHoneyPage(path, lang) {
	await fs.mkdir(`${CACHE_DIR}/honeyhunter`, { recursive: true })
	const url = `https://genshin.honeyhunterworld.com/db/${path}/`
	const fpath = `${CACHE_DIR}/honeyhunter/${path.replace(/\//g, '-')}-${lang}.html`
	await getFileCached(url, { lang: lang.toLocaleUpperCase() }, fpath, false, Infinity)
	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}

/**
 * @param {string} path
 * @param {string} lang
 * @param {RegExp} titleRe
 * @param {RegExp} nameColRe
 * @param {RegExp} aHrefIdRe
 * @returns {Promise<{id:string, name:string}[]>}
 */
async function getNamesFromTable(path, lang, titleRe, nameColRe, aHrefIdRe) {
	const root = await getHoneyPage(path, lang)
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

const DUMMY_NODE = /**@type {import('../lib/xml').Node}*/ ({ tag: '', attrs: {}, children: [] })
/**
 * @param {import('../lib/xml').Node[]} cells
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
 * @param {import('../lib/xml').Node[]} cells
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
 * @param {string} lang
 * @returns {Promise<{id:string, name:string}[]>}
 */
async function getCharacterNames(lang) {
	const root = await getHoneyPage('char/characters', lang)
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
