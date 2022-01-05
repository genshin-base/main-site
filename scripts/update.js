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
	loadArtifactNames,
	loadBuilds,
	loadCharacters,
	loadDomains,
	loadWeapons,
	prepareCacheDir,
	saveArtifactsNames,
	saveBuilds,
	saveCharacters,
	saveDomains,
	saveWeapons,
	WWW_DYNAMIC_DIR,
	WWW_MEDIA_DIR,
	WWW_STATIC_DIR,
} from './_common.js'
import { magick, mediaChain, optipng, pngquant, resize, runCmd } from '#lib/media.js'
import { getFileCached } from '#lib/requests.js'

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
		await extractAndSaveDomainLocationImages(!!args['--force'])
	}
	if (updWww) await saveWwwData()

	info('done.')
	// setTimeout(() => {}, 1000000)
})().catch(console.error)

async function extractAndSaveBuildsData() {
	info('updating builds', { newline: false })

	const artifactCodes = Object.entries(await loadArtifactNames()).map(([code]) => code)
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
	clearHoneyhunterFixesUsage(fixes.honeyhunter)
	await saveWeapons((await extractWeaponsData(DATA_CACHE_DIR, LANGS, fixes.honeyhunter)).items)
	await saveArtifactsNames((await extractArtifactsData(DATA_CACHE_DIR, LANGS, fixes.honeyhunter)).items)
	await saveCharacters((await extractCharactersData(DATA_CACHE_DIR, LANGS, fixes.honeyhunter)).items)
	await saveDomains((await extractDomainsData(DATA_CACHE_DIR, LANGS, fixes.honeyhunter)).items)
	checkHoneyhunterFixesUsage(fixes.honeyhunter)
	progress()
}

/** @param {boolean} overwriteExisting */
async function extractAndSaveItemImages(overwriteExisting) {
	const builds = await loadBuilds()
	const usedArtCodes = new Set(builds.characters.map(x => Array.from(getCharacterArtifactCodes(x))).flat())
	const usedWeaponCodes = new Set(builds.characters.map(x => Array.from(getCharacterWeaponCodes(x))).flat())

	{
		info('updating artifacts images', { newline: false })

		const { imgs } = await extractArtifactsData(IMGS_CACHE_DIR, LANGS, fixes.honeyhunter)
		for (const code of imgs.keys()) if (!usedArtCodes.has(code)) imgs.delete(code)

		await fs.mkdir(`${WWW_MEDIA_DIR}/artifacts`, { recursive: true })
		const stats = await getAndProcessItemImages(imgs, IMGS_CACHE_DIR, 'artifacts', async code => {
			const dest = `${WWW_MEDIA_DIR}/artifacts/${code}.png`
			if (overwriteExisting || !(await exists(dest)))
				return src => mediaChain(src, dest, (i, o) => resize(i, o, '64x64'), pngquant, optipng)
		})

		info(`  saved ${stats.loaded} of total ${stats.total}`)
	}
	{
		info('updating weapons images', { newline: false })

		const { imgs } = await extractWeaponsData(IMGS_CACHE_DIR, LANGS, fixes.honeyhunter)
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

async function extractAndSaveDomainLocationImages(overwriteExisting) {
	info('updating domain location images', { newline: false })

	const SIZE = 1024
	const SCALED_SIZE = 512

	const tileUrlFunc = (x, y) => `https://gim.appsample.net/teyvat/v22/10/tile-${x}_${y}.jpg`
	const tileSize = 256
	const x2tile = x => (x + 169) / tileSize + 1
	const y2tile = y => (y + 19) / tileSize + 5
	const tileFract = n => Math.floor((((n % 1) + 1) % 1) * tileSize)

	await fs.mkdir(`${IMGS_CACHE_DIR}/gim/tiles`, { recursive: true })
	await fs.mkdir(`${WWW_MEDIA_DIR}/domains`, { recursive: true })

	const domains = await loadDomains()
	let count = 0
	for (const domain of Object.values(domains)) {
		const [x, y] = domain.location

		const outFPath = `${WWW_MEDIA_DIR}/domains/${domain.code}.png`
		if (!overwriteExisting && (await exists(outFPath))) continue

		const xOffset = tileFract(x2tile(x + SIZE / 2))
		const yOffset = 255 - tileFract(y2tile(y + SIZE / 2))
		const iFrom = Math.floor(x2tile(x - SIZE / 2))
		const iTo = Math.floor(x2tile(x + SIZE / 2))
		const jFrom = Math.floor(y2tile(y - SIZE / 2))
		const jTo = Math.floor(y2tile(y + SIZE / 2))

		const tiles = []
		for (let j = jTo; j >= jFrom; j--) {
			for (let i = iFrom; i <= iTo; i++) {
				const fpath = `${IMGS_CACHE_DIR}/gim/tiles/${i}_${j}.jpg`
				await getFileCached(tileUrlFunc(i, j), null, fpath, false, Infinity)
				tiles.push(fpath)
			}
		}

		const concatTiles = (_, out) =>
			runCmd('montage', [...tiles, '-mode', 'Concatenate', '-tile', `${iTo - iFrom + 1}`, 'png:' + out])
		const cropAndScale = (i, o) =>
			magick(i, o, ['-crop', `${SIZE}x${SIZE}+${xOffset}+${yOffset}`, '-scale', `${SCALED_SIZE}`])
		await mediaChain('', outFPath, concatTiles, cropAndScale, pngquant, optipng)
		count++
		progress()
	}
	info(`  saved ${count} of total ${Object.keys(domains).length}`)
}

async function saveWwwData() {
	info('updating www JSONs', { newline: false })

	const builds = await loadBuilds()
	const characters = await loadCharacters()
	const artifactNames = await loadArtifactNames()
	const weapons = await loadWeapons()

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
				makeCharacterFullInfo(character, characters, artifacts, buildWeapons, lang),
			)

		await whiteJsonAndHash(`${WWW_DYNAMIC_DIR}/artifacts-${lang}.json`, artifacts)
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

import type { CharacterShortInfo } from '#lib/parsing/helperteam/characters'
export const charactersShortList: CharacterShortInfo[] =
	${JSON.stringify(makeCharacterShortList(builds.characters, characters))}

import type { CharacterFullInfo } from '#lib/parsing/helperteam/characters'
export { CharacterFullInfo }
export function apiGetCharacterFullInfo(code:string, signal:AbortSignal): Promise<CharacterFullInfo> {
	return get(\`characters/\${code}\`, signal)
}

import type { ArtifactFullInfo } from '#lib/parsing/helperteam/artifacts'
export { ArtifactFullInfo }
export function apiGetArtifacts(signal:AbortSignal): Promise<ArtifactFullInfo[]> {
	return get(\`artifacts\`, signal)
}

import type { WeaponFullInfo } from '#lib/parsing/helperteam/weapons'
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
