#!/bin/node
import { promises as fs } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import {
	extractBuilds,
	makeCharacterBuildInfo,
	makeCharacterShortList,
	makeRecentChangelogsTable,
} from '../lib/parsing/index.js'
import yaml from 'yaml'
import { loadSpreadsheetCached } from '../lib/google.js'
import { checkFixesUsage, clearFixesUsage } from '../lib/parsing/fixes.js'
import { json_getText } from '../lib/parsing/json.js'

const __filename = fileURLToPath(import.meta.url)
const baseDir = dirname(__filename) + '/..'
const CACHE_DIR = `${baseDir}/cache`
const DATA_DIR = `${baseDir}/builds_data`

const DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

/** @type {import('../lib/parsing/fixes.js').BuildsExtractionFixes} */
const fixes = {
	weapons: [
		{
			col: 'name',
			replace: /Favonious Codex/i,
			with: 'favonius codex',
		},
		{
			col: 'name',
			replace: /Wavebreaker/i,
			with: "Wavebreaker's Fin",
		},
	],
	charactersArtifactsMatch: [
		{
			characterCodes: ['rosaria'],
			replace: /Lavawalkers Epiphany/i,
			with: 'lavawalker',
		},
		{
			characterCodes: ['diona', 'qiqi', 'sayu'],
			replace: /Maiden's Beloved/i,
			with: 'maiden beloved',
		},
	],
	charactersWeaponsMatch: [
		{
			characterCodes: ['traveler'],
			replace: /^Aquilla Favonia$/i,
			with: 'aquila favonia',
		},
		{
			characterCodes: ['xiangling'],
			replace: /^Wavebreaker$/i,
			with: "Wavebreaker's Fin",
		},
		{
			characterCodes: ['xinyan'],
			replace: /^Skyrider's Greatsword$/i,
			with: 'Skyrider Greatsword',
		},
		{
			characterCodes: ['kaeya'],
			replace: /^Anemona Kageuchi$/i,
			with: 'Amenoma Kageuchi',
		},
		{
			characterCodes: ['amber', 'fischl', 'kujou-sara', 'childe', 'ganyu'],
			replace: /^Viridescent Hunt$/i,
			with: 'The Viridescent Hunt',
		},
	],
	sheets: [
		{
			// у Барбары у столбца роли нет заголовка
			title: /^hydro/i,
			fixFunc(sheet) {
				for (const { values: cells = [] } of sheet.data[0].rowData) {
					for (let i = 0; i < cells.length; i++) {
						const cell = cells[i]
						if (json_getText(cell).trim().toLocaleLowerCase() === 'barbara') {
							if (cells.length > i + 1 && json_getText(cells[i + 1]).trim() === '') {
								cells[i + 1].userEnteredValue = { stringValue: 'role' }
								return true
							}
						}
					}
				}
				return false
			},
		},
	],
}

;(async () => {
	await fs.mkdir(CACHE_DIR, { recursive: true })

	const spreadsheet = await loadSpreadsheetCached(
		`${baseDir}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		`${CACHE_DIR}/spreadsheet.json`,
		DOC_ID,
		[
			'sheets.properties',
			'sheets.data.rowData.values.userEnteredValue',
			'sheets.data.rowData.values.userEnteredFormat.textFormat',
			'sheets.data.rowData.values.textFormatRuns',
		],
	)

	clearFixesUsage(fixes)
	const build = await extractBuilds(spreadsheet, fixes)
	checkFixesUsage(fixes)

	console.log('')
	// console.log(yaml.stringify(build.elementMap['pyro']))
	// console.log(JSON.stringify(build.elementMap))

	// build.changelogsTable.rows.length = 0
	// console.log(JSON.stringify(build).length)

	await fs.mkdir(DATA_DIR, { recursive: true })
	await fs.writeFile(`${DATA_DIR}/generated.yaml`, yaml.stringify(build))

	await fs.writeFile(`${DATA_DIR}/characters.json`, JSON.stringify(makeCharacterShortList(build)))

	await fs.rm(`${DATA_DIR}/characters`, { recursive: true, force: true })
	await fs.mkdir(`${DATA_DIR}/characters`, { recursive: true })
	for (const character of build.characters)
		await fs.writeFile(
			`${DATA_DIR}/characters/${character.code}.json`,
			JSON.stringify(makeCharacterBuildInfo(build, character)),
		)

	await fs.writeFile(`${DATA_DIR}/changelogs.json`, JSON.stringify(build.changelogsTable))
	await fs.writeFile(
		`${DATA_DIR}/changelogs_recent.json`,
		JSON.stringify(makeRecentChangelogsTable(build.changelogsTable)),
	)

	// setTimeout(() => {}, 1000000)
})().catch(console.error)
