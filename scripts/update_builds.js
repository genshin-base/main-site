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
const WWW_STATIC_DIR = `${baseDir}/www/src/generated`
const WWW_DYNAMIC_DIR = `${baseDir}/www/public/generated`

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
			characterCodes: ['amber', 'fischl', 'kujou-sara', 'tartaglia', 'ganyu'],
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

	// console.log(yaml.stringify(build.elementMap['pyro']))
	// console.log(JSON.stringify(build.elementMap))

	// build.changelogsTable.rows.length = 0
	// console.log(JSON.stringify(build).length)

	/** @type {import('./update_langs').ItemsLangNames} */
	const characterNames = yaml.parse(await fs.readFile(`${DATA_DIR}/character_names.yaml`, 'utf-8'))

	/** @type {import('./update_langs').ItemsLangNames} */
	const weaponNames = yaml.parse(await fs.readFile(`${DATA_DIR}/weapon_names.yaml`, 'utf-8'))

	/** @type {import('./update_langs').ItemsLangNames} */
	const artifactNames = yaml.parse(await fs.readFile(`${DATA_DIR}/artifact_names.yaml`, 'utf-8'))

	const lang = 'en'

	await fs.mkdir(DATA_DIR, { recursive: true })
	await fs.writeFile(`${DATA_DIR}/builds.yaml`, yaml.stringify(build))

	for (const dir of [WWW_STATIC_DIR, WWW_DYNAMIC_DIR]) {
		await fs.rm(dir, { recursive: true, force: true })
		await fs.mkdir(dir, { recursive: true })
	}

	await fs.writeFile(
		`${WWW_STATIC_DIR}/index.ts`,
		`
import { apiGetJSONFile } from 'src/api'

import type { CharacterShortInfo } from 'lib/parsing'
export const charactersShortList: CharacterShortInfo[] = ${JSON.stringify(makeCharacterShortList(build))}

import type { CharacterFullInfo } from 'lib/parsing'
export { CharacterFullInfo }
export function apiGetCharacterFullInfo(code:string, signal:AbortSignal): Promise<CharacterFullInfo> {
	return apiGetJSONFile(\`/generated/characters/\${code}.json\`, signal)
}`,
	)

	await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
	for (const character of build.characters)
		await fs.writeFile(
			`${WWW_DYNAMIC_DIR}/characters/${character.code}.json`,
			JSON.stringify(makeCharacterBuildInfo(build, character, characterNames, lang)),
		)

	await fs.writeFile(`${WWW_DYNAMIC_DIR}/weapons.json`, JSON.stringify(build.weapons))
	await fs.writeFile(`${WWW_DYNAMIC_DIR}/artifacts.json`, JSON.stringify(build.artifacts))

	await fs.writeFile(`${WWW_DYNAMIC_DIR}/changelogs.json`, JSON.stringify(build.changelogsTable))
	await fs.writeFile(
		`${WWW_DYNAMIC_DIR}/changelogs_recent.json`,
		JSON.stringify(makeRecentChangelogsTable(build.changelogsTable)),
	)

	// setTimeout(() => {}, 1000000)
})().catch(console.error)
