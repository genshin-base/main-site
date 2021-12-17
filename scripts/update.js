#!/usr/bin/env node
import { promises as fs } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'yaml'
import { extractBuilds } from '#lib/parsing/helperteam/index.js'
import { loadSpreadsheetCached } from '#lib/google.js'
import { checkFixesUsage, clearFixesUsage } from '#lib/parsing/helperteam/fixes.js'
import { json_getText } from '#lib/parsing/helperteam/json.js'
import {
	extractArtifactsLangNames,
	extractCharactersLangNames,
	extractWeaponsLangNames,
} from '#lib/parsing/honeyhunter/index.js'
import { makeCharacterFullInfo, makeCharacterShortList } from '#lib/parsing/helperteam/characters.js'
import { makeArtifactFullInfo } from '#lib/parsing/helperteam/artifacts.js'
import { makeWeaponFullInfo } from '#lib/parsing/helperteam/weapons.js'
import { makeRecentChangelogsTable } from '#lib/parsing/helperteam/changelogs.js'
import { trigramSearcherFromStrings } from '#lib/trigrams.js'

const DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

const LANGS = ['en', 'ru']

/** @type {import('#lib/parsing/helperteam/fixes.js').BuildsExtractionFixes} */
const fixes = {
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
	await extractAndSaveLangNames()
	await extractAndSaveBuildsInfo()
	await saveWwwData()
	console.log('done.')
	// setTimeout(() => {}, 1000000)
})().catch(console.error)

async function extractAndSaveBuildsInfo() {
	const artifactCodes = Object.entries(await loadArtifactNames()).map(([code]) => code)
	const weaponCodes = Object.entries(await loadWeaponNames()).map(([code]) => code)
	const knownCodes = {
		artifacts: trigramSearcherFromStrings(artifactCodes),
		weapons: trigramSearcherFromStrings(weaponCodes),
	}

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
	const build = await extractBuilds(spreadsheet, knownCodes, fixes)
	checkFixesUsage(fixes)

	await fs.mkdir(DATA_DIR, { recursive: true })
	await saveBuilds(build)
}

async function extractAndSaveLangNames() {
	await fs.mkdir(DATA_DIR, { recursive: true })
	await saveWeaponsNames(await extractWeaponsLangNames(CACHE_DIR, LANGS))
	await saveArtifactsNames(await extractArtifactsLangNames(CACHE_DIR, LANGS))
	await saveCharactersNames(await extractCharactersLangNames(CACHE_DIR, LANGS))
}

async function saveWwwData() {
	const builds = await loadBuilds()
	const characterNames = await loadCharacterNames()
	const artifactNames = await loadArtifactNames()
	const weaponNames = await loadWeaponNames()

	for (const dir of [WWW_STATIC_DIR, WWW_DYNAMIC_DIR]) {
		await fs.rm(dir, { recursive: true, force: true })
		await fs.mkdir(dir, { recursive: true })
	}

	await fs.writeFile(
		`${WWW_STATIC_DIR}/index.ts`,
		`
import { apiGetJSONFile } from '#src/api'

const LANG = 'en'

import type { CharacterShortInfo } from '#lib/parsing/helperteam/characters'
export const charactersShortList: CharacterShortInfo[] =
	${JSON.stringify(makeCharacterShortList(builds.characters))}

import type { CharacterFullInfo } from '#lib/parsing/helperteam/characters'
export { CharacterFullInfo }
export function apiGetCharacterFullInfo(code:string, signal:AbortSignal): Promise<CharacterFullInfo> {
	return apiGetJSONFile(\`/generated/characters/\${code}-\${LANG}.json\`, signal)
}

import type { ArtifactFullInfo } from '#lib/parsing/helperteam/artifacts'
export { ArtifactFullInfo }
export function apiGetArtifacts(code:string, signal:AbortSignal): Promise<ArtifactFullInfo[]> {
	return apiGetJSONFile(\`/generated/artifacts-\${LANG}.json\`, signal)
}

import type { WeaponFullInfo } from '#lib/parsing/helperteam/weapons'
export { WeaponFullInfo }
export function apiGetWeapons(code:string, signal:AbortSignal): Promise<WeaponFullInfo[]> {
	return apiGetJSONFile(\`/generated/weapons-\${LANG}.json\`, signal)
}

import type { ChangelogsTable } from '#lib/parsing/helperteam/changelogs'
export { ChangelogsTable }
export function apiGetChangelogs(onlyRecent:boolean, signal:AbortSignal): Promise<ChangelogsTable> {
	return apiGetJSONFile(\`/generated/changelogs\${onlyRecent ? '-recent' : ''}.json\`, signal)
}`,
	)

	for (const lang of LANGS) {
		const artifacts = builds.artifacts.map(x => makeArtifactFullInfo(x, artifactNames, lang))
		const weapons = builds.weapons.map(x => makeWeaponFullInfo(x, weaponNames, lang))

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
		for (const character of builds.characters)
			await fs.writeFile(
				`${WWW_DYNAMIC_DIR}/characters/${character.code}-${lang}.json`,
				JSON.stringify(makeCharacterFullInfo(character, characterNames, artifacts, weapons, lang)),
			)

		await fs.writeFile(`${WWW_DYNAMIC_DIR}/artifacts-${lang}.json`, JSON.stringify(artifacts))
		await fs.writeFile(`${WWW_DYNAMIC_DIR}/weapons-${lang}.json`, JSON.stringify(weapons))
	}
	await fs.writeFile(`${WWW_DYNAMIC_DIR}/changelogs.json`, JSON.stringify(builds.changelogsTable))
	await fs.writeFile(
		`${WWW_DYNAMIC_DIR}/changelogs-recent.json`,
		JSON.stringify(makeRecentChangelogsTable(builds.changelogsTable)),
	)
}

/**
 * @param {string} prefix
 * @param {import('#lib/parsing').ItemsLangNames} names
 */
async function saveNames(prefix, names) {
	await fs.writeFile(`${DATA_DIR}/${prefix}_names.yaml`, yaml.stringify(names))
}
/**
 * @param {string} prefix
 * @returns {Promise<import('#lib/parsing').ItemsLangNames>}
 */
async function loadNames(prefix) {
	return yaml.parse(await fs.readFile(`${DATA_DIR}/${prefix}_names.yaml`, 'utf-8'))
}

/** @param {import('#lib/parsing/helperteam').BuildInfo} builds */
async function saveBuilds(builds) {
	await fs.writeFile(`${DATA_DIR}/builds.yaml`, yaml.stringify(builds))
}
/** @returns {Promise<import('#lib/parsing/helperteam').BuildInfo>} */
async function loadBuilds() {
	return yaml.parse(await fs.readFile(`${DATA_DIR}/builds.yaml`, 'utf-8'))
}

const saveCharactersNames = saveNames.bind(null, 'character')
const loadCharacterNames = loadNames.bind(null, 'character')

const saveArtifactsNames = saveNames.bind(null, 'artifact')
const loadArtifactNames = loadNames.bind(null, 'artifact')

const saveWeaponsNames = saveNames.bind(null, 'weapon')
const loadWeaponNames = loadNames.bind(null, 'weapon')
