#!/usr/bin/env node
import { promises as fs } from 'fs'
import { loadSpreadsheet, updateSpreadsheet } from '#lib/google.js'
import { json_packText } from '#lib/parsing/helperteam/json.js'
import { error } from '#lib/utils/logs.js'
import { YAMLError } from 'yaml/util'
import { BASE_DIR, CACHE_DIR, parseYaml } from './_common.js'

const DOC_ID = '1i5KQPYepEm1a6Gu56vN6Ixprb892zixNbrFcrIB39Bc' //test
// const DOC_ID = '1UA7RwCWBG_Nyp78sQuM7XTj6mNVG_Rv-uafMB2k37Pc'

//
;(async () => {
	const builds = /** @type {import('#lib/parsing/helperteam').BuildInfo[]} */ ([])

	for (const fpath of process.argv.slice(2)) {
		const buildText = await fs.readFile(fpath, 'utf-8')
		try {
			builds.push(parseYaml(buildText))
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
	const sheet = spreadsheet.sheets.find(x => /translation/i.test(x.properties.title.trim()))
	if (!sheet) throw new Error(`sheet 'translation' not found`)

	const rows = /**@type {import('#lib/google').RowData[]}*/ ([])
	/** @param  {...(string|[string, import('#lib/google').TextFormatRun[]])} items */
	function addRow(...items) {
		const values = items.map(x =>
			typeof x === 'string'
				? { userEnteredValue: { stringValue: x } }
				: { userEnteredValue: { stringValue: x[0] }, textFormatRuns: x[1] },
		)
		while (values.length < 2 + builds.length) values.push({ userEnteredValue: { stringValue: '' } })
		rows.push({ values })
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

	for (const characters of zip(builds.map(x => x.characters))) {
		const charCode = ensureSameCode(characters)
		console.log(charCode)
		addRow(charCode, 'credits', ...characters.map(x => packTextOrBlank(x.credits)))
		addRow()
		for (const roles of zip(characters.map(x => x.roles))) {
			const roleCode = ensureSameCode(roles)
			console.log(charCode + ':' + roleCode)
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

	await updateSpreadsheet(
		`${BASE_DIR}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		DOC_ID,
		{
			updateCells: {
				rows,
				fields: '*',
				start: {
					sheetId: sheet.properties.sheetId,
					rowIndex: 0,
					columnIndex: 0,
				},
			},
		},
	)
})().catch(error)
