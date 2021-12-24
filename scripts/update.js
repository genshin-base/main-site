#!/usr/bin/env node
import { promises as fs } from 'fs'
import { extractBuilds } from '#lib/parsing/helperteam/index.js'
import { loadSpreadsheetCached } from '#lib/google.js'
import { json_getText } from '#lib/parsing/helperteam/json.js'
import {
	extractArtifactsData,
	extractCharactersData,
	extractDomainsData,
	extractWeaponsData,
	getAndProcessItemImages,
} from '#lib/parsing/honeyhunter/index.js'
import {
	getCharacterArtifactCodes,
	getCharacterWeaponCodes,
	makeCharacterFullInfo,
	makeCharacterShortList,
} from '#lib/parsing/helperteam/characters.js'
import { makeArtifactFullInfo } from '#lib/parsing/helperteam/artifacts.js'
import { makeWeaponFullInfo } from '#lib/parsing/helperteam/weapons.js'
import { makeRecentChangelogsTable } from '#lib/parsing/helperteam/changelogs.js'
import { trigramSearcherFromStrings } from '#lib/trigrams.js'
import { createHash } from 'crypto'
import { info, parseArgs, relativeToCwd } from '#lib/utils.js'
import { checkHelperteamFixesUsage, clearHelperteamFixesUsage } from '#lib/parsing/helperteam/fixes.js'
import { checkHoneyhunterFixesUsage, clearHoneyhunterFixesUsage } from '#lib/parsing/honeyhunter/fixes.js'
import {
	BASE_DIR,
	CACHE_DIR,
	DATA_DIR,
	loadArtifactNames,
	loadBuilds,
	loadCharacterNames,
	loadWeaponNames,
	saveArtifactsNames,
	saveBuilds,
	saveCharactersNames,
	saveDomains,
	saveWeaponsNames,
	WWW_DYNAMIC_DIR,
	WWW_MEDIA_DIR,
	WWW_STATIC_DIR,
} from './_common.js'
import { mediaChain, optipng, pngquant, resize } from '#lib/media.js'

const DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

const LANGS = ['en', 'ru']

const fixes = {
	/** @type {import('#lib/parsing/helperteam/fixes').HelperteamFixes} */
	helperteam: {
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
	},
	/** @type {import('#lib/parsing/honeyhunter/fixes').HoneyhunterFixes} */
	honeyhunter: {
		statuses: {
			// некоторые предметы почему-то находятся в таблице нерелизнутого
			weapons: [
				{ actually: 'released', name: 'Predator' },
				{ actually: 'released', name: "Mouun's Moon" },
			],
		},
	},
}

const args = parseArgs()

function printUsage() {
	console.log(`Usage:
  node ${relativeToCwd(process.argv[1])} [-h|--help] [--data] [--imgs] [--all] [--force]`)
}

if (args['--help'] || args['-h']) {
	printUsage()
	process.exit(2)
}

;(async () => {
	if (args['--force']) {
		info('force update, clearing cache')
		await fs.rm(CACHE_DIR, { recursive: true, force: true })
	}

	let updData = args['--data'] ?? args['--all'] ?? !args['--imgs']
	let updImgs = args['--imgs'] ?? args['--all'] ?? args['--force']

	if (updData) await extractAndSaveLangNames()
	if (updData) await extractAndSaveBuildsInfo()
	if (updImgs) await extractAndSaveItemImages()
	if (updData) await saveWwwData()

	info('done.')
	// setTimeout(() => {}, 1000000)
})().catch(console.error)

async function extractAndSaveBuildsInfo() {
	info('updating builds')

	const artifactCodes = Object.entries(await loadArtifactNames()).map(([code]) => code)
	const weaponCodes = Object.entries(await loadWeaponNames()).map(([code]) => code)
	const knownCodes = {
		artifacts: trigramSearcherFromStrings(artifactCodes),
		weapons: trigramSearcherFromStrings(weaponCodes),
	}

	await fs.mkdir(CACHE_DIR, { recursive: true })

	const spreadsheet = await loadSpreadsheetCached(
		`${BASE_DIR}/google.private_key.json`,
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

	clearHelperteamFixesUsage(fixes.helperteam)
	const build = await extractBuilds(spreadsheet, knownCodes, fixes.helperteam)
	checkHelperteamFixesUsage(fixes.helperteam)

	await fs.mkdir(DATA_DIR, { recursive: true })
	await saveBuilds(build)
}

async function extractAndSaveLangNames() {
	info('updating items')
	await fs.mkdir(DATA_DIR, { recursive: true })
	clearHoneyhunterFixesUsage(fixes.honeyhunter)
	await saveWeaponsNames((await extractWeaponsData(CACHE_DIR, LANGS, fixes.honeyhunter)).items)
	await saveArtifactsNames((await extractArtifactsData(CACHE_DIR, LANGS, fixes.honeyhunter)).langNames)
	await saveCharactersNames((await extractCharactersData(CACHE_DIR, LANGS)).langNames)
	await saveDomains((await extractDomainsData(CACHE_DIR, LANGS, fixes.honeyhunter)).items)
	checkHoneyhunterFixesUsage(fixes.honeyhunter)
}

async function extractAndSaveItemImages() {
	const builds = await loadBuilds()
	const usedArtCodes = new Set(builds.characters.map(x => Array.from(getCharacterArtifactCodes(x))).flat())
	const usedWeaponCodes = new Set(builds.characters.map(x => Array.from(getCharacterWeaponCodes(x))).flat())

	{
		info('updating artifacts images')

		const { imgs } = await extractArtifactsData(CACHE_DIR, LANGS, fixes.honeyhunter)
		for (const code of imgs.keys()) if (!usedArtCodes.has(code)) imgs.delete(code)

		await fs.mkdir(`${WWW_MEDIA_DIR}/artifacts`, { recursive: true })
		await getAndProcessItemImages(imgs, CACHE_DIR, 'artifacts', async (srcFPath, code) => {
			const dest = `${WWW_MEDIA_DIR}/artifacts/${code}.png`
			await mediaChain(srcFPath, dest, (i, o) => resize(i, o, '64x64'), pngquant, optipng)
		})
	}
	{
		info('updating weapons images')

		const { imgs } = await extractWeaponsData(CACHE_DIR, LANGS, fixes.honeyhunter)
		for (const code of imgs.keys()) if (!usedWeaponCodes.has(code)) imgs.delete(code)

		await fs.mkdir(`${WWW_MEDIA_DIR}/weapons`, { recursive: true })
		await getAndProcessItemImages(imgs, CACHE_DIR, 'weapons', async (srcFPath, code) => {
			const dest = `${WWW_MEDIA_DIR}/weapons/${code}.png`
			await mediaChain(srcFPath, dest, (i, o) => resize(i, o, '64x64'), pngquant, optipng)
		})
	}
}

async function saveWwwData() {
	info('updating www JSONs')

	const builds = await loadBuilds()
	const characterNames = await loadCharacterNames()
	const artifactNames = await loadArtifactNames()
	const weapons = await loadWeaponNames()

	for (const dir of [WWW_STATIC_DIR, WWW_DYNAMIC_DIR]) {
		await fs.rm(dir, { recursive: true, force: true })
		await fs.mkdir(dir, { recursive: true })
	}

	const md5sum = createHash('md5')
	async function whiteJsonAndHash(path, data) {
		const content = JSON.stringify(data)
		await fs.writeFile(path, content)
		md5sum.update(content)
	}

	for (const lang of LANGS) {
		const artifacts = builds.artifacts.map(x =>
			makeArtifactFullInfo(x, artifactNames, builds.characters, lang),
		)
		const buildWeapons = builds.weapons.map(x => makeWeaponFullInfo(x, weapons, lang))

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
		for (const character of builds.characters)
			await whiteJsonAndHash(
				`${WWW_DYNAMIC_DIR}/characters/${character.code}-${lang}.json`,
				makeCharacterFullInfo(character, characterNames, artifacts, buildWeapons, lang),
			)

		await whiteJsonAndHash(`${WWW_DYNAMIC_DIR}/artifacts-${lang}.json`, artifacts)
		await whiteJsonAndHash(`${WWW_DYNAMIC_DIR}/weapons-${lang}.json`, buildWeapons)
	}
	await whiteJsonAndHash(`${WWW_DYNAMIC_DIR}/changelogs.json`, builds.changelogsTable)
	await whiteJsonAndHash(
		`${WWW_DYNAMIC_DIR}/changelogs-recent.json`,
		makeRecentChangelogsTable(builds.changelogsTable),
	)

	const hash = md5sum.digest('hex').slice(0, 8)
	await fs.writeFile(
		`${WWW_STATIC_DIR}/index.ts`,
		`
import { apiGetJSONFile } from '#src/api'

const LANG = 'en'

const get = <T>(prefix:string, signal:AbortSignal) =>
	apiGetJSONFile(\`generated/\${prefix}-\${LANG}.json?v=${hash}\`, signal) as Promise<T>

import type { CharacterShortInfo } from '#lib/parsing/helperteam/characters'
export const charactersShortList: CharacterShortInfo[] =
	${JSON.stringify(makeCharacterShortList(builds.characters))}

import type { CharacterFullInfo } from '#lib/parsing/helperteam/characters'
export { CharacterFullInfo }
export function apiGetCharacterFullInfo(code:string, signal:AbortSignal): Promise<CharacterFullInfo> {
	return get(\`characters/\${code}\`, signal)
}

import type { ArtifactFullInfo } from '#lib/parsing/helperteam/artifacts'
export { ArtifactFullInfo }
export function apiGetArtifacts(code:string, signal:AbortSignal): Promise<ArtifactFullInfo[]> {
	return get(\`artifacts\`, signal)
}

import type { WeaponFullInfo } from '#lib/parsing/helperteam/weapons'
export { WeaponFullInfo }
export function apiGetWeapons(code:string, signal:AbortSignal): Promise<WeaponFullInfo[]> {
	return get(\`weapons\`, signal)
}

import type { ChangelogsTable } from '#lib/parsing/helperteam/changelogs'
export { ChangelogsTable }
export function apiGetChangelogs(onlyRecent:boolean, signal:AbortSignal): Promise<ChangelogsTable> {
	return get(\`changelogs\${onlyRecent ? '-recent' : ''}\`, signal)
}`,
	)
}
