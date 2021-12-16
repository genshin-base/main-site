#!/bin/node
import { promises as fs } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'yaml'
import {
	extractBuilds,
	makeCharacterBuildInfo,
	makeCharacterShortList,
	makeRecentChangelogsTable,
} from '#lib/parsing/helperteam/index.js'
import { loadSpreadsheetCached } from '#lib/google.js'
import { checkFixesUsage, clearFixesUsage } from '#lib/parsing/helperteam/fixes.js'
import { json_getText } from '#lib/parsing/helperteam/json.js'
import {
	extractArtifactsLangNames,
	extractCharactersLangNames,
	extractWeaponsLangNames,
} from '#lib/parsing/honeyhunter/index.js'

const DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

const LANGS = ['en', 'ru']

/** @type {import('#lib/parsing/helperteam/fixes.js').BuildsExtractionFixes} */
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

const __filename = fileURLToPath(import.meta.url)
const baseDir = dirname(__filename) + '/..'
const CACHE_DIR = `${baseDir}/cache`
const DATA_DIR = `${baseDir}/builds_data`
const WWW_STATIC_DIR = `${baseDir}/www/src/generated`
const WWW_DYNAMIC_DIR = `${baseDir}/www/public/generated`

;(async () => {
	console.log('processing builds...')
	await extractAndSaveBuildsInfo()

	console.log('processing langs...')
	await extractAndSaveLangNames()

	console.log('saving www data...')
	await saveWwwData()

	console.log('done.')
	// setTimeout(() => {}, 1000000)
})().catch(console.error)

async function extractAndSaveBuildsInfo() {
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

	await fs.mkdir(DATA_DIR, { recursive: true })
	await fs.writeFile(`${DATA_DIR}/builds.yaml`, yaml.stringify(build))
}

async function extractAndSaveLangNames() {
	await fs.mkdir(DATA_DIR, { recursive: true })
	await fs.writeFile(
		`${DATA_DIR}/weapon_names.yaml`,
		yaml.stringify(await extractWeaponsLangNames(CACHE_DIR, LANGS)),
	)
	await fs.writeFile(
		`${DATA_DIR}/artifact_names.yaml`,
		yaml.stringify(await extractArtifactsLangNames(CACHE_DIR, LANGS)),
	)
	await fs.writeFile(
		`${DATA_DIR}/character_names.yaml`,
		yaml.stringify(await extractCharactersLangNames(CACHE_DIR, LANGS)),
	)
}

async function saveWwwData() {
	/** @type {import('#lib/parsing/helperteam').BuildInfo} */
	const builds = yaml.parse(await fs.readFile(`${DATA_DIR}/builds.yaml`, 'utf-8'))

	/** @type {import('#lib/parsing').ItemsLangNames} */
	const characterNames = yaml.parse(await fs.readFile(`${DATA_DIR}/character_names.yaml`, 'utf-8'))

	/** @type {import('#lib/parsing').ItemsLangNames} */
	const weaponNames = yaml.parse(await fs.readFile(`${DATA_DIR}/weapon_names.yaml`, 'utf-8'))

	/** @type {import('#lib/parsing').ItemsLangNames} */
	const artifactNames = yaml.parse(await fs.readFile(`${DATA_DIR}/artifact_names.yaml`, 'utf-8'))

	const lang = 'en'

	for (const dir of [WWW_STATIC_DIR, WWW_DYNAMIC_DIR]) {
		await fs.rm(dir, { recursive: true, force: true })
		await fs.mkdir(dir, { recursive: true })
	}

	await fs.writeFile(
		`${WWW_STATIC_DIR}/index.ts`,
		`
import { apiGetJSONFile } from 'src/api'

import type { CharacterShortInfo } from '#lib/parsing/helperteam'
export const charactersShortList: CharacterShortInfo[] = ${JSON.stringify(makeCharacterShortList(builds))}

import type { CharacterFullInfo } from '#lib/parsing/helperteam'
export { CharacterFullInfo }
export function apiGetCharacterFullInfo(code:string, signal:AbortSignal): Promise<CharacterFullInfo> {
	return apiGetJSONFile(\`/generated/characters/\${code}.json\`, signal)
}`,
	)

	await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
	for (const character of builds.characters)
		await fs.writeFile(
			`${WWW_DYNAMIC_DIR}/characters/${character.code}.json`,
			JSON.stringify(makeCharacterBuildInfo(builds, character, characterNames, lang)),
		)

	await fs.writeFile(`${WWW_DYNAMIC_DIR}/weapons.json`, JSON.stringify(builds.weapons))
	await fs.writeFile(`${WWW_DYNAMIC_DIR}/artifacts.json`, JSON.stringify(builds.artifacts))

	await fs.writeFile(`${WWW_DYNAMIC_DIR}/changelogs.json`, JSON.stringify(builds.changelogsTable))
	await fs.writeFile(
		`${WWW_DYNAMIC_DIR}/changelogs_recent.json`,
		JSON.stringify(makeRecentChangelogsTable(builds.changelogsTable)),
	)
}
