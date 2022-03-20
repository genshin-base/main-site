#!/usr/bin/env node
import { promises as fs } from 'fs'
import { loadSpreadsheet, updateSpreadsheet } from '#lib/google.js'
import { json_extractText, json_getText, json_packText } from '#lib/parsing/helperteam/json.js'
import { error, fatal, info, warn } from '#lib/utils/logs.js'
import {
	BASE_DIR,
	CACHE_DIR,
	GENERATED_DATA_DIR,
	loadArtifacts,
	loadItems,
	loadWeapons,
	parseYaml,
	saveTranslatedBuilds,
} from './_common.js'
import { parseArgs, relativeToCwd } from '#lib/utils/os.js'
import { mustBeNotNull } from '#lib/utils/values.js'
import { buildsConvertLangMode } from '#lib/parsing/helperteam/index.js'
import { getInlineText } from '#lib/parsing/helperteam/text.js'
import { trigramMustGetWithThresh, TrigramSearcher } from '#lib/trigrams.js'
import { ART_GROUP_18_ATK_CODE, ART_GROUP_20_ER_CODE } from '#lib/genshin.js'

// const DOC_ID = '1i5KQPYepEm1a6Gu56vN6Ixprb892zixNbrFcrIB39Bc' //test
const DOC_ID = '1UA7RwCWBG_Nyp78sQuM7XTj6mNVG_Rv-uafMB2k37Pc'

const args = parseArgs()
const needHelp = args['--help'] || args['-h']
const thisScript = `node ${relativeToCwd(process.argv[1])}`

function printUsage() {
	console.log(`Usage:
  ${thisScript} <${Object.keys(commands).join('|')}> [-h|--help]`)
}

const commands = { upload, download }

;(async () => {
	if (args['cmd'] in commands) {
		await commands[args['cmd']]()
	} else {
		printUsage()
		process.exit(needHelp ? 2 : 1)
	}
})().catch(fatal)

async function upload() {
	if (needHelp) {
		console.log(`Usage:
  ${thisScript} upload --lang0=builds0.yaml [--lang1=builds1.yaml ...] [-h|--help]`)
		process.exit(2)
	}

	/** @type {{lang:string, data:import('#lib/parsing/helperteam/types').BuildInfo<'monolang'>}[]} */
	const builds = []

	const items = Object.entries(args).filter(([k, v]) => k !== 'cmd')
	for (const [name, fpath] of items) {
		const lang = mustBeNotNull(name.match(/^-*(.*)$/))[1]
		const buildText = await fs.readFile(fpath, 'utf-8')
		builds.push({ lang, data: parseYaml(buildText) })
	}

	const spreadsheet = await loadSpreadsheet(
		`${BASE_DIR}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		DOC_ID,
		['sheets.properties'],
	)
	const sheets = mustGetSheets(spreadsheet.sheets)

	const characterRows = /**@type {import('#lib/google').RowData[]}*/ ([])
	1
	{
		const addRow = addRowTo.bind(null, characterRows, 2 + builds.length)

		addRow('', '', ...builds.map(x => x.lang))
		addRow()

		for (const characters of zip(builds.map(x => x.data.characters))) {
			const charCode = ensureSameCode(characters)
			info('processing ' + charCode)
			addRow(charCode, 'credits', ...characters.map(x => packTextOrBlank(x.credits)))
			addRow()
			for (const roles of zip(characters.map(x => x.roles))) {
				const roleCode = ensureSameCode(roles)
				info('processing ' + charCode + ':' + roleCode)
				addRow(charCode + ':' + roleCode, 'notes', ...roles.map(x => packTextOrBlank(x.notes)))
				addRow('', 'tips', ...roles.map(x => packTextOrBlank(x.tips)))
				addRow('', 'weapon notes', ...roles.map(x => packTextOrBlank(x.weapons.notes)))
				zip(roles.map(x => x.weapons.advices)).forEach((advices, i) => {
					for (const similars of zip(advices.map(x => x.similar))) {
						const weapCode = ensureSameCode(similars)
						if (!textsAreBlank(similars.map(x => x.notes)))
							addRow(
								'',
								`weapon #${i} ${weapCode} notes`,
								...similars.map(x => packTextOrBlank(x.notes)),
							)
					}
				})
				addRow('', 'artifact notes', ...roles.map(x => packTextOrBlank(x.artifacts.notes)))
				zip(roles.map(x => x.artifacts.sets)).forEach((sets, i) => {
					if (!textsAreBlank(sets.map(x => x.notes)))
						addRow('', `artifact #${i} notes`, ...sets.map(x => packTextOrBlank(x.notes)))
				})
				addRow()
			}
			for (let i = 0; i < 2; i++) addRow()
		}

		for (let i = 0; i < 10; i++) addRow()
	}

	info('uploading...')
	await updateSpreadsheet(
		`${BASE_DIR}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		DOC_ID,
		[
			{
				updateCells: {
					rows: characterRows,
					fields: '*',
					start: {
						sheetId: sheets.characters.properties.sheetId,
						rowIndex: 0,
						columnIndex: 0,
					},
				},
			},
		],
	)
	info('done.')
}

async function download() {
	if (needHelp) {
		console.log(`Usage:
  ${thisScript} download --langs=en,ru [--base=generated-builds.yaml] [-h|--help]`)
		process.exit(2)
	}

	const baseFPath = args['--base'] ?? `${GENERATED_DATA_DIR}/builds.yaml`
	const langs = args['--langs']
		.split(',')
		.map(x => x.trim().toLocaleLowerCase())
		.filter(x => x !== '')

	if (langs.length === 0) {
		error(`need at least one lang`)
		process.exit(1)
	}

	info(`reading generated build...`)
	/** @type {import('#lib/parsing/helperteam/types').BuildInfo<'monolang'>} */
	const builds = await parseYaml(await fs.readFile(baseFPath, 'utf-8'))
	const langBuilds = buildsConvertLangMode(builds, 'multilang', block =>
		block === null ? {} : Object.fromEntries(langs.map(lang => [lang, block])),
	)

	info(`reading items data...`)
	/**
	 * @template {{code:string, name:Record<string,string>}} T
	 * @param {Record<string, T>} code2item
	 */
	function makeSearcher(code2item, type) {
		const s = /**@type {TrigramSearcher<{name:string, code:string}>}*/ (new TrigramSearcher())
		for (const item of Object.values(code2item))
			for (const lang of langs) {
				if (!(lang in item.name)) {
					error(`${type} '${item.code}' has no ${lang}-name`)
					process.exit(1)
				}
				s.add(item.name[lang], { name: item.name[lang], code: item.code })
			}
		return s
	}
	const searchers = {
		artifacts: makeSearcher(await loadArtifacts(), 'artifact'),
		weapons: makeSearcher(await loadWeapons(), 'weapon'),
		items: makeSearcher(await loadItems(), 'item'),
	}
	for (const code of [ART_GROUP_18_ATK_CODE, ART_GROUP_20_ER_CODE])
		searchers.artifacts.add(code, { name: code, code })

	info(`loading spreadsheet...`)
	const spreadsheet = await loadSpreadsheet(
		`${BASE_DIR}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		DOC_ID,
		[
			'sheets.properties',
			'sheets.data.rowData.values.userEnteredValue',
			'sheets.data.rowData.values.userEnteredFormat.textFormat',
			'sheets.data.rowData.values.textFormatRuns',
		],
	)
	const sheets = mustGetSheets(spreadsheet.sheets)

	info(`merging translations...`)
	{
		const lang2col = makeLangColMap(sheets.characters)
		const extractTexts = extractLangTexts.bind(null, lang2col, langs, searchers)

		let curCharacter = null
		let curRole = null
		for (let i = 1; i < sheets.characters.data[0].rowData.length; i++) {
			const { values: cells = [] } = sheets.characters.data[0].rowData[i]
			if (cells.length === 0) {
				curCharacter = curRole = null
				continue
			}

			try {
				const label0 = json_getText(cells[0]).trim()
				if (label0 && !label0.includes(':')) {
					// персонаж
					curCharacter = langBuilds.characters.find(x => x.code === label0)
					if (!curCharacter) throw new Error(`wrong character '${label0}'`)
				} else if (label0.includes(':')) {
					// персонаж:роль
					const [charCode, roleCode] = label0.split(':', 2)
					curCharacter = langBuilds.characters.find(x => x.code === charCode)
					if (!curCharacter) throw new Error(`wrong character in '${label0}'`)
					curRole = curCharacter.roles.find(x => x.code === roleCode)
					if (!curRole)
						throw new Error(
							`wrong role in '${label0}', correct: ` + curCharacter.roles.map(x => x.code),
						)
				}

				const field = json_getText(cells[1]).trim()
				if (curCharacter && !curRole) {
					if (field === 'credits') {
						curCharacter.credits = extractTexts(cells)
					} else throw new Error(`'${curCharacter.code}': unexpected field '${field}'`)
				} else if (curCharacter && curRole) {
					const errPrefix = `'${curCharacter.code}' '${curRole.code}'`
					let m
					if (field === 'notes') {
						curRole.notes = extractTexts(cells)
					} else if (field === 'tips') {
						curRole.tips = extractTexts(cells)
					} else if (field === 'weapon notes') {
						curRole.weapons.notes = extractTexts(cells)
					} else if (field === 'artifact notes') {
						curRole.artifacts.notes = extractTexts(cells)
					} else if ((m = field.match(/^weapon #(\d+) (\S+) notes$/)) !== null) {
						const [, index, code] = m
						if (+index >= curRole.weapons.advices.length)
							throw new Error(`${errPrefix}: wrong weapon advice #${index}`)
						const weapon = curRole.weapons.advices[+index].similar.find(x => x.code === code)
						if (!weapon) throw new Error(`${errPrefix}: unknown weapon '${code}'`)
						weapon.notes = extractTexts(cells)
					} else if ((m = field.match(/^artifact #(\d+) notes$/)) !== null) {
						const [, index] = m
						if (+index >= curRole.artifacts.sets.length)
							throw new Error(`${errPrefix}: wrong art advice #${index}`)
						curRole.artifacts.sets[+index].notes = extractTexts(cells)
					} else throw new Error(`${errPrefix}: unexpected field '${field}'`)
				}
			} catch (ex) {
				if (ex.constructor !== Error) throw ex
				throw new Error(`on doc row ${i + 1}: ${ex.message}`)
			}
		}
	}

	info(`saving...`)
	langBuilds.characters.sort((a, b) => a.code.localeCompare(b.code)) //сортировка по коду для удобства поиска
	await saveTranslatedBuilds(builds, langBuilds, langs)

	// await saveYaml('a.yaml', langBuilds)
	// const t = await loadTranslatedBuilds()
	// await saveYaml('b.yaml', t)

	info(`done.`)
}

/** @param {import('#lib/google.js').Sheet[]} sheets */
function mustGetSheets(sheets) {
	function mustGet(re) {
		const sheet = sheets.find(x => re.test(x.properties.title.trim()))
		if (!sheet) throw new Error(`sheet ${re} not found`)
		return sheet
	}
	return {
		characters: mustGet(/characters/i),
	}
}

/**
 * @template T
 * @param {T[][]} arrs
 * @returns {T[][]}
 */
function zip(arrs) {
	if (arrs.length === 0) return []
	const len = arrs[0].length
	for (const arr of arrs.slice(1))
		if (len !== arr.length)
			throw new Error(
				`arr len ${len} != ${arr.length}:\n` +
					`  ${JSON.stringify(arrs[0])}\n` +
					`  ${JSON.stringify(arr)}`,
			)
	const res = []
	for (let i = 0; i < len; i++) res.push(arrs.map((_, j) => arrs[j][i]))
	return res
}
/** @param {{code:string}[]} items */
function ensureSameCode(items) {
	const code = items[0].code
	for (const item of items.slice(1)) if (code !== item.code) throw new Error(`${code} != ${item.code}`)
	return code
}
/** @param {import('#lib/parsing/helperteam/text').CompactTextParagraphs|null} paragraphs */
function packTextOrBlank(paragraphs) {
	return paragraphs === null ? '' : json_packText(paragraphs)
}
/** @param {(import('#lib/parsing/helperteam/text').CompactTextParagraphs|null)[]} texts */
function textsAreBlank(texts) {
	return texts.every(x => x === null)
}

/**
 * @param {import('#lib/google').RowData[]} rows
 * @param {number} maxCols
 * @param  {...(string|[string, import('#lib/google').TextFormatRun[]])} items
 */
function addRowTo(rows, maxCols, ...items) {
	const values = items.map(x =>
		typeof x === 'string'
			? { userEnteredValue: { stringValue: x } }
			: { userEnteredValue: { stringValue: x[0] }, textFormatRuns: x[1] },
	)
	while (values.length < maxCols) values.push({ userEnteredValue: { stringValue: '' } })
	rows.push({ values })
}

/** @param {import('#lib/google').Sheet} sheet */
function makeLangColMap(sheet) {
	return new Map(
		(sheet.data[0].rowData[0].values ?? []).map((cell, i) => {
			return [json_getText(cell).trim().toLocaleLowerCase(), i]
		}),
	)
}

/**
 * @typedef {{
 *   artifacts: TrigramSearcher<{name:string, code:string}>,
 *   weapons: TrigramSearcher<{name:string, code:string}>,
 *   items: TrigramSearcher<{name:string, code:string}>,
 * }} ItemSearchers
 */

/**
 * @param {import('#lib/parsing/helperteam/text').TextNodeA} node
 * @param {ItemSearchers} searchers
 * @returns {import('#lib/parsing/helperteam/text').TextNodeInline}
 */
function mustMapSpecialLinks(node, searchers) {
	if (!node.href.startsWith('#')) return node
	let m
	if ((m = node.href.match(/^#weapon(?::(.+)|$)/))) {
		const name = m[1] ?? getInlineText(node.a).trim()
		const code = trigramMustGetWithThresh(searchers.weapons, name, x => x.name).code
		return { weapon: node.a, code }
	} else if ((m = node.href.match(/^#artifact(?::(.+)|$)/))) {
		let name = m[1] ?? getInlineText(node.a).trim()
		name = name.replace(/\s+\(\d+\)$/, '') // cut "... (4)"
		const code = trigramMustGetWithThresh(searchers.artifacts, name, x => x.name).code
		return { artifact: node.a, code }
	} else if ((m = node.href.match(/^#item(?::(.+)|$)/))) {
		const name = m[1] ?? getInlineText(node.a).trim()
		const code = trigramMustGetWithThresh(searchers.items, name, x => x.name).code
		return { item: node.a, code }
	} else {
		warn(`special link '${getInlineText(node)}': wrong type: '${node.href}', using as regular <a>`)
		return node
	}
}
/**
 * @param {import('#lib/google').CellData|undefined} data
 * @param {ItemSearchers} searchers
 */
function extractTextOrNull(data, searchers) {
	let prevNode = null
	function mapInlineNode(/**@type {import('#lib/parsing/helperteam/text').TextNodeInline}*/ node) {
		if (typeof node !== 'string' && 'a' in node)
			try {
				node = mustMapSpecialLinks(node, searchers)
			} catch (ex) {
				throw prevNode
					? new Error(`after '${getInlineText(prevNode).slice(-16)}': ` + ex.message)
					: ex
			}
		prevNode = node
		return node
	}
	const pars = json_extractText(data, null, null, null, mapInlineNode)
	return Array.isArray(pars) && pars.length === 0 ? null : pars
}

/**
 * @param {Map<string, number>} lang2col
 * @param {string[]} langs
 * @param {ItemSearchers} searchers
 * @param {import('#lib/google').CellData[]} cells
 */
function extractLangTexts(lang2col, langs, searchers, cells) {
	/** @type {Record<string, import('#lib/parsing/helperteam/text').CompactTextParagraphs>} */
	const res = {}
	for (const lang of langs) {
		const col = lang2col.get(lang)
		if (!col) throw new Error(`col for lang '${lang}' not found`)
		const text = extractTextOrNull(cells.at(col), searchers)
		if (text !== null) res[lang] = text
	}
	const size = Object.keys(res).length
	if (size > 0 && size !== langs.length)
		warn(`expected translation for [${langs}], got onlt for [${Object.keys(res)}]`)
	return res
}
