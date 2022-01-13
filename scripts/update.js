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
import { getCharacterArtifactCodes, getCharacterWeaponCodes } from '#lib/parsing/helperteam/characters.js'
import { makeRecentChangelogsTable } from '#lib/parsing/helperteam/changelogs.js'
import { trigramSearcherFromStrings } from '#lib/trigrams.js'
import { createHash } from 'crypto'
import { exists, parseArgs, relativeToCwd } from '#lib/utils/os.js'
import { info, progress } from '#lib/utils/logs.js'
import { checkHelperteamFixesUsage, clearHelperteamFixesUsage } from '#lib/parsing/helperteam/fixes.js'
import { checkHoneyhunterFixesUsage, clearHoneyhunterFixesUsage } from '#lib/parsing/honeyhunter/fixes.js'
import {
	BASE_DIR,
	CACHE_DIR,
	DATA_CACHE_DIR,
	DATA_DIR,
	IMGS_CACHE_DIR,
	loadArtifacts,
	loadBuilds,
	loadCharacters,
	loadDomains,
	loadWeapons,
	prepareCacheDir,
	saveArtifacts,
	saveBuilds,
	saveCharacters,
	saveDomains,
	saveItems,
	saveWeapons,
	WWW_DYNAMIC_DIR,
	WWW_MEDIA_DIR,
	WWW_STATIC_DIR,
} from './_common.js'
import { mediaChain, optipng, pngquant, resize } from '#lib/media.js'
import {
	makeArtifactFullInfo,
	makeCharacterFullInfo,
	makeCharacterShortList,
	makeWeaponFullInfo,
} from '#lib/parsing/combine.js'
import { extractItemsData } from '#lib/parsing/honeyhunter/items.js'

const DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

const LANGS = ['en', 'ru']

const fixes = {
	/** @type {import('#lib/parsing/helperteam/fixes').HelperteamFixes} */
	helperteam: {
		roleNotes: [
			{ character: 'kaeya', role: 'cryo dps', searchAs: 'dps' },
			{ character: 'kaeya', role: 'physical dps', searchAs: 'dps' },
		],
		sheets: [
			{
				// у Барбары у столбца роли нет заголовка
				title: /^hydro$/i,
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
			{
				// у Эмбер один набор артефактов прописан в странном формате
				title: /^pyro$/i,
				fixFunc(sheet) {
					const substr = '2x +20% Energy Recharge%'
					const replaceWith = '20% ER set (2) 20% ER set (2)'
					for (const { values: cells = [] } of sheet.data[0].rowData) {
						for (const cell of cells) {
							const text = json_getText(cell)
							if (text.includes(substr)) {
								delete cell.textFormatRuns
								cell.userEnteredValue = {
									stringValue: text.replace(substr, replaceWith),
								}
								return true
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
				{ actually: 'released', name: 'Calamity Queller' },
			],
		},
		travelerLangNames: {
			anemo: {
				en: 'Anemo Traveler',
				ru: 'Анемо Путешественник',
			},
			geo: {
				en: 'Geo Traveler',
				ru: 'Гео Путешественник',
			},
			electro: {
				en: 'Electro Traveler',
				ru: 'Электро Путешественник',
			},
		},
	},
}

const args = parseArgs()

function printUsage() {
	console.log(`Usage:
  node ${relativeToCwd(process.argv[1])} [data|www|images] [-h|--help] [--force] [--ignore-cache]`)
}

if (args['--help'] || args['-h']) {
	printUsage()
	process.exit(2)
}

;(async () => {
	const updData = [undefined, 'data'].includes(args['cmd'])
	const updImgs = [undefined, 'images'].includes(args['cmd'])
	const updWww = [undefined, 'www'].includes(args['cmd'])

	if (updData) {
		await prepareCacheDir(DATA_CACHE_DIR, !!args['--ignore-cache'])
		await extractAndSaveItemsData()
		await extractAndSaveBuildsData()
	}
	if (updImgs) {
		await prepareCacheDir(IMGS_CACHE_DIR, !!args['--ignore-cache'])
		await extractAndSaveItemImages(!!args['--force'])
	}
	if (updWww) await saveWwwData()

	info('done.')
	// setTimeout(() => {}, 1000000)
})().catch(console.error)

async function extractAndSaveBuildsData() {
	info('updating builds', { newline: false })

	const artifactCodes = Object.entries(await loadArtifacts()).map(([code]) => code)
	const weaponCodes = Object.entries(await loadWeapons()).map(([code]) => code)
	const knownCodes = {
		artifacts: trigramSearcherFromStrings(artifactCodes),
		weapons: trigramSearcherFromStrings(weaponCodes),
	}

	const spreadsheet = await loadSpreadsheetCached(
		`${BASE_DIR}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		`${DATA_CACHE_DIR}/spreadsheet.json`,
		DOC_ID,
		[
			'sheets.properties',
			'sheets.data.rowData.values.userEnteredValue',
			'sheets.data.rowData.values.userEnteredFormat.textFormat',
			'sheets.data.rowData.values.textFormatRuns',
		],
	)
	progress()

	clearHelperteamFixesUsage(fixes.helperteam)
	const build = await extractBuilds(spreadsheet, knownCodes, fixes.helperteam)
	checkHelperteamFixesUsage(fixes.helperteam)

	await fs.mkdir(DATA_DIR, { recursive: true })
	await saveBuilds(build)
	progress()
}

async function extractAndSaveItemsData() {
	info('updating items', { newline: false })
	await fs.mkdir(DATA_DIR, { recursive: true })
	const cd = DATA_CACHE_DIR
	const fx = fixes.honeyhunter
	clearHoneyhunterFixesUsage(fx)

	const items = await extractItemsData(cd, LANGS, fx)
	const artifacts = await extractArtifactsData(cd, LANGS, fx)
	await saveItems(items.code2item)
	await saveArtifacts(artifacts.code2item)
	await saveWeapons((await extractWeaponsData(cd, LANGS, items.id2item, fx)).items)
	await saveCharacters((await extractCharactersData(cd, LANGS, fx)).items)
	await saveDomains((await extractDomainsData(cd, LANGS, items.id2item, artifacts.id2item, fx)).items)

	checkHoneyhunterFixesUsage(fx)
	progress()
}

/** @param {boolean} overwriteExisting */
async function extractAndSaveItemImages(overwriteExisting) {
	const builds = await loadBuilds()
	const usedArtCodes = new Set(builds.characters.map(x => Array.from(getCharacterArtifactCodes(x))).flat())
	const usedWeaponCodes = new Set(builds.characters.map(x => Array.from(getCharacterWeaponCodes(x))).flat())

	{
		info('updating artifacts images', { newline: false })

		const { code2img } = await extractArtifactsData(IMGS_CACHE_DIR, LANGS, fixes.honeyhunter)
		for (const code of code2img.keys()) if (!usedArtCodes.has(code)) code2img.delete(code)

		await fs.mkdir(`${WWW_MEDIA_DIR}/artifacts`, { recursive: true })
		const stats = await getAndProcessItemImages(code2img, IMGS_CACHE_DIR, 'artifacts', async code => {
			const dest = `${WWW_MEDIA_DIR}/artifacts/${code}.png`
			if (overwriteExisting || !(await exists(dest)))
				return src => mediaChain(src, dest, (i, o) => resize(i, o, '64x64'), pngquant, optipng)
		})

		info(`  saved ${stats.loaded} of total ${stats.total}`)
	}
	{
		info('updating weapons images', { newline: false })

		const { imgs } = await extractWeaponsData(IMGS_CACHE_DIR, LANGS, null, fixes.honeyhunter)
		for (const code of imgs.keys()) if (!usedWeaponCodes.has(code)) imgs.delete(code)

		await fs.mkdir(`${WWW_MEDIA_DIR}/weapons`, { recursive: true })
		const stats = await getAndProcessItemImages(imgs, IMGS_CACHE_DIR, 'weapons', async code => {
			const dest = `${WWW_MEDIA_DIR}/weapons/${code}.png`
			if (overwriteExisting || !(await exists(dest)))
				return src => mediaChain(src, dest, (i, o) => resize(i, o, '64x64'), pngquant, optipng)
		})

		info(`  saved ${stats.loaded} new of total ${stats.total}`)
	}
}

async function saveWwwData() {
	info('updating www JSONs', { newline: false })

	const builds = await loadBuilds()
	const characters = await loadCharacters()
	const artifacts = await loadArtifacts()
	const weapons = await loadWeapons()
	const domains = await loadDomains()

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
		const buildArtifacts = builds.artifacts.map(x =>
			makeArtifactFullInfo(x, artifacts, domains, builds.characters, lang),
		)
		const buildWeapons = builds.weapons.map(x => makeWeaponFullInfo(x, weapons, domains, lang))

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
		for (const character of builds.characters)
			await whiteJsonAndHash(
				`${WWW_DYNAMIC_DIR}/characters/${character.code}-${lang}.json`,
				makeCharacterFullInfo(character, characters, buildArtifacts, buildWeapons, lang),
			)

		await whiteJsonAndHash(`${WWW_DYNAMIC_DIR}/artifacts-${lang}.json`, buildArtifacts)
		await whiteJsonAndHash(`${WWW_DYNAMIC_DIR}/weapons-${lang}.json`, buildWeapons)
		progress()
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

import type { CharacterShortInfo } from '#lib/parsing/combine'
export const charactersShortList: CharacterShortInfo[] =
	${JSON.stringify(makeCharacterShortList(builds.characters, characters))}

import type { CharacterFullInfo } from '#lib/parsing/combine'
export { CharacterFullInfo }
export function apiGetCharacterFullInfo(code:string, signal:AbortSignal): Promise<CharacterFullInfo> {
	return get(\`characters/\${code}\`, signal)
}

import type { ArtifactFullInfo } from '#lib/parsing/combine'
export { ArtifactFullInfo }
export function apiGetArtifacts(signal:AbortSignal): Promise<ArtifactFullInfo[]> {
	return get(\`artifacts\`, signal)
}

import type { WeaponFullInfo } from '#lib/parsing/combine'
export { WeaponFullInfo }
export function apiGetWeapons(signal:AbortSignal): Promise<WeaponFullInfo[]> {
	return get(\`weapons\`, signal)
}

import type { ChangelogsTable } from '#lib/parsing/helperteam/changelogs'
export { ChangelogsTable }
export function apiGetChangelogs(onlyRecent:boolean, signal:AbortSignal): Promise<ChangelogsTable> {
	return get(\`changelogs\${onlyRecent ? '-recent' : ''}\`, signal)
}`,
	)
	progress()
}
