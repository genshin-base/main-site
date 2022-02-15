#!/usr/bin/env node
import { promises as fs } from 'fs'
import { loadSpreadsheet, updateSpreadsheet } from '#lib/google.js'
import { json_extractText, json_getText, json_packText } from '#lib/parsing/helperteam/json.js'
import { error, info } from '#lib/utils/logs.js'
import { YAMLError } from 'yaml/util'
import { BASE_DIR, CACHE_DIR, parseYaml, stringifyYaml } from './_common.js'
import { parseArgs, relativeToCwd } from '#lib/utils/os.js'
import { mustBeNotNull } from '#lib/utils/values.js'

const DOC_ID = '1i5KQPYepEm1a6Gu56vN6Ixprb892zixNbrFcrIB39Bc' //test
// const DOC_ID = '1UA7RwCWBG_Nyp78sQuM7XTj6mNVG_Rv-uafMB2k37Pc'

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
})().catch(error)

async function upload() {
	if (needHelp) {
		console.log(`Usage:
  ${thisScript} upload --lang0=builds0.yaml [--lang1=builds1.yaml ...] [-h|--help]`)
		process.exit(2)
	}

	const builds = /** @type {{lang:string, data:import('#lib/parsing/helperteam').BuildInfo}[]} */ ([])

	const items = Object.entries(args).filter(([k, v]) => k !== 'cmd')
	for (const [name, fpath] of items) {
		const lang = mustBeNotNull(name.match(/^-*(.*)$/))[1]
		const buildText = await fs.readFile(fpath, 'utf-8')
		try {
			builds.push({ lang, data: parseYaml(buildText) })
		} catch (ex) {
			if (ex instanceof YAMLError) {
				const lineNum = pos => buildText.slice(0, pos).split('\n').length
				error(ex.message)
				if (ex.source?.['resolved']) error(`  value: ${(ex.source?.['resolved'] + '').trim()}`)
				if (ex.source?.range)
					error(`  lines ${lineNum(ex.source.range.start)}-${lineNum(ex.source.range.end)}`)
				process.exit(1)
			} else throw ex
		}
	}

	const spreadsheet = await loadSpreadsheet(
		`${BASE_DIR}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		DOC_ID,
		['sheets.properties'],
	)
	const sheets = mustGetSheets(spreadsheet.sheets)

	const characterRows = /**@type {import('#lib/google').RowData[]}*/ ([])
	const weaponRows = /**@type {import('#lib/google').RowData[]}*/ ([])
	const artifactRows = /**@type {import('#lib/google').RowData[]}*/ ([])
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
	{
		info('processing weapons')

		const addRow = addRowTo.bind(null, weaponRows, 2 + builds.length)
		addRow('', '', ...builds.map(x => x.lang))
		addRow()

		for (const weapons of zip(builds.map(x => x.data.weapons))) {
			const code = ensureSameCode(weapons)
			addRow(code, 'passive', ...weapons.map(x => packTextOrBlank(x.passiveStat)))
		}
		for (let i = 0; i < 10; i++) addRow()
	}
	{
		info('processing artifacts')

		const addRow = addRowTo.bind(null, artifactRows, 2 + builds.length)
		addRow('', '', ...builds.map(x => x.lang))
		addRow()

		for (const artifacts of zip(builds.map(x => x.data.artifacts))) {
			const code = ensureSameCode(artifacts)
			if (textsAreBlank(artifacts.map(x => x.sets['1'] ?? null))) {
				addRow(code, 'x2', ...artifacts.map(x => packTextOrBlank(x.sets['2'] ?? null)))
				addRow(code, 'x4', ...artifacts.map(x => packTextOrBlank(x.sets['4'] ?? null)))
			} else {
				addRow(code, 'x1', ...artifacts.map(x => packTextOrBlank(x.sets['1'] ?? null)))
			}
			addRow()
		}
		for (let i = 0; i < 10; i++) addRow()
	}

	info('uploading...')
	await updateSpreadsheet(
		`${BASE_DIR}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		DOC_ID,
		[
			{ id: sheets.characters.properties.sheetId, rows: characterRows },
			{ id: sheets.weapons.properties.sheetId, rows: weaponRows },
			{ id: sheets.artifacts.properties.sheetId, rows: artifactRows },
		].map(({ id, rows }) => ({
			updateCells: {
				rows,
				fields: '*',
				start: {
					sheetId: id,
					rowIndex: 0,
					columnIndex: 0,
				},
			},
		})),
	)
	info('done.')
}

async function download() {
	const wrongArgs = process.argv.length < 5
	if (needHelp || wrongArgs) {
		console.log(`Usage:
  ${thisScript} download generated-builds.yaml output-builds.yaml [-h|--help]`)
		process.exit(wrongArgs ? 1 : 2)
	}

	const inFPath = process.argv[3]
	const outFPath = process.argv[4]

	/** @type {import('#lib/parsing/helperteam').BuildInfo} */
	const builds = await parseYaml(await fs.readFile(inFPath, 'utf-8'))

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

	{
		const langs = sheets.characters.data[0].rowData[0].values ?? []

		let curCharacter = null
		let curRole = null
		for (const { values: cells = [] } of sheets.characters.data[0].rowData.slice(1)) {
			if (cells.length === 0) {
				curCharacter = curRole = null
				continue
			}

			const label0 = json_getText(cells[0]).trim()
			if (label0 && !label0.includes(':')) {
				// персонаж
				curCharacter = builds.characters.find(x => x.code === label0)
				if (!curCharacter) throw new Error(`wrong character '${label0}'`)
			} else if (label0.includes(':')) {
				// персонаж:роль
				const [charCode, roleCode] = label0.split(':', 2)
				curCharacter = builds.characters.find(x => x.code === charCode)
				if (!curCharacter) throw new Error(`wrong character in '${label0}'`)
				curRole = curCharacter.roles.find(x => x.code === roleCode)
				if (!curCharacter) throw new Error(`wrong role in '${label0}'`)
			}

			const dataColNum = 2

			const field = json_getText(cells[1]).trim()
			if (curCharacter && !curRole) {
				if (field === 'credits') {
					curCharacter.credits = extractTextOrNull(cells[dataColNum])
				} else throw new Error(`'${curCharacter.code}': unexpected field '${field}'`)
			} else if (curCharacter && curRole) {
				const errPrefix = `'${curCharacter.code}' '${curRole.code}'`
				let m
				if (field === 'notes') {
					curRole.notes = extractTextOrNull(cells[dataColNum])
				} else if (field === 'tips') {
					curRole.tips = extractTextOrNull(cells[dataColNum])
				} else if (field === 'weapon notes') {
					curRole.weapons.notes = extractTextOrNull(cells[dataColNum])
				} else if (field === 'artifact notes') {
					curRole.artifacts.notes = extractTextOrNull(cells[dataColNum])
				} else if ((m = field.match(/^weapon #(\d+) (\S+) notes$/)) !== null) {
					const [, index, code] = m
					if (+index >= curRole.weapons.advices.length)
						throw new Error(`${errPrefix}: wrong weapon advice #${index}`)
					const weapon = curRole.weapons.advices[+index].similar.find(x => x.code === code)
					if (!weapon) throw new Error(`${errPrefix}: unknown weapon '${code}'`)
					weapon.notes = extractTextOrNull(cells[dataColNum])
				} else if ((m = field.match(/^artifact #(\d+) notes$/)) !== null) {
					const [, index] = m
					if (+index >= curRole.artifacts.sets.length)
						throw new Error(`${errPrefix}: wrong art advice #${index}`)
					curRole.artifacts.sets[+index].notes = extractTextOrNull(cells[dataColNum])
				} else throw new Error(`${errPrefix}: unexpected field '${field}'`)
			}
		}
	}

	await fs.writeFile(outFPath, stringifyYaml(builds))
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
		weapons: mustGet(/weapons/i),
		artifacts: mustGet(/artifacts/i),
	}
}

/**
 * @param {import('#lib/google').CellData} data
 */
function extractTextOrNull(data) {
	const pars = json_extractText(data)
	return Array.isArray(pars) && pars.length === 0 ? null : pars
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
