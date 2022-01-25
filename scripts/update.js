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
	getAndProcessMappedImages,
} from '#lib/parsing/honeyhunter/index.js'
import { getCharacterArtifactCodes, getCharacterWeaponCodes } from '#lib/parsing/helperteam/characters.js'
import { makeRecentChangelogsTable } from '#lib/parsing/helperteam/changelogs.js'
import { trigramSearcherFromStrings } from '#lib/trigrams.js'
import { createHash } from 'crypto'
import { exists, parseArgs, relativeToCwd } from '#lib/utils/os.js'
import { error, info, progress, warn } from '#lib/utils/logs.js'
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
	loadEnemies,
	loadEnemyGroups,
	loadItems,
	loadWeapons,
	prepareCacheDir,
	saveArtifacts,
	saveBuilds,
	saveCharacters,
	saveDomains,
	saveEnemies,
	saveEnemyGroups,
	saveItems,
	saveWeapons,
	WWW_DYNAMIC_DIR,
	WWW_MEDIA_DIR,
	WWW_STATIC_DIR,
} from './_common.js'
import { mediaChain, optipng, pngquant, resize } from '#lib/media.js'
import {
	excludeDomainBosses,
	extractFullInfoLocations,
	makeArtifactsFullInfo,
	makeCharacterFullInfo,
	makeCharacterShortList,
	makeWeaponsFullInfo,
} from '#lib/parsing/combine.js'
import { extractItemsData } from '#lib/parsing/honeyhunter/items.js'
import {
	extractEnemiesData,
	makeEnemyGroups,
	replaceEnemiesByGroups,
} from '#lib/parsing/honeyhunter/enemies.js'
import { applyWeaponsObtainData } from '#lib/parsing/wiki/weapons.js'
import { applyItemsLocations } from '#lib/parsing/mihoyo/map.js'

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
		items: (() => {
			function addType(type) {
				return (/**@type {import('#lib/parsing').ItemData}*/ item) => {
					if (item.types.includes(type)) return false
					item.types.push(type)
					return true
				}
			}
			return [
				// некоторые предметы используются для прокачки, но почему-то отсутствуют на
				// https://genshin.honeyhunterworld.com/db/item/character-ascension-material-local-material/
				{ code: 'spectral-nucleus', fixFunc: addType('character-material-local') },
				{ code: 'dendrobium', fixFunc: addType('character-material-local') },
				{ code: 'onikabuto', fixFunc: addType('character-material-local') },
			]
		})(),
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
		skipEnemies: [
			/^Millelith/i, //
			/^Treasure Hoarders - Boss$/,
			/Bathysmal Vishap$/i,
		],
		manualEnemyGroups: [
			{ origNames: /^Ruin Guard$/ },
			{ origNames: /^Ruin Hunter$/ },
			{ origNames: /^Ruin Grader$/ },
			{ origNames: /Bathysmal Vishap$/ },
			{ origNames: /^Geovishap Hatchling$/ },
			{ origNames: /^Geovishap$/ },
			{
				origNames: /^Ruin (Cruiser|Destroyer|Defender|Scout)$/,
				name: { en: 'Ruin Sentinel', ru: 'Часовой руин' },
			},
			{
				origNames: /^(Rockfond|Thundercraven) Rifthound( Whelp)?$/,
				name: { en: 'Wolves of the Rift', ru: 'Волк Разрыва' },
			},
		],
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
		await extractAndSaveAllItemsData()
		await extractAndSaveBuildsData()
	}
	if (updImgs) {
		await prepareCacheDir(IMGS_CACHE_DIR, !!args['--ignore-cache'])
		await extractAndSaveItemImages(!!args['--force'])
	}
	if (updWww) await saveWwwData()

	info('done.')
	// setTimeout(() => {}, 1000000)
})().catch(error)

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

async function extractAllItemsData() {
	const cd = DATA_CACHE_DIR
	const fx = fixes.honeyhunter
	clearHoneyhunterFixesUsage(fx)

	const items = await extractItemsData(cd, LANGS, fx)
	const artifacts = await extractArtifactsData(cd, LANGS, fx)
	const weapons = await extractWeaponsData(cd, LANGS, items.id2item, fx)
	const enemies = await extractEnemiesData(cd, LANGS, items.id2item, artifacts.id2item, fx)
	const domains = await extractDomainsData(cd, LANGS, items.id2item, artifacts.id2item, enemies.id2item, fx)
	const characters = await extractCharactersData(cd, LANGS, items.id2item, fx)
	const enemyGroups = makeEnemyGroups(enemies.code2item, fixes.honeyhunter)

	await applyWeaponsObtainData(cd, weapons.code2item)
	await applyItemsLocations(cd, enemies.code2item, enemyGroups.code2item, items.code2item)

	checkHoneyhunterFixesUsage(fx)
	progress()

	return { items, artifacts, weapons, enemies, domains, characters, enemyGroups }
}
async function extractAndSaveAllItemsData() {
	info('updating items', { newline: false })
	await fs.mkdir(DATA_DIR, { recursive: true })

	const { items, artifacts, weapons, enemies, domains, characters, enemyGroups } =
		await extractAllItemsData()

	await saveItems(items.code2item)
	await saveArtifacts(artifacts.code2item)
	await saveWeapons(weapons.code2item)
	await saveCharacters(characters.code2item)
	await saveDomains(domains.code2item)
	await saveEnemies(enemies.code2item)
	await saveEnemyGroups(enemyGroups.code2item)

	progress()
}

/** @param {boolean} overwriteExisting */
async function extractAndSaveItemImages(overwriteExisting) {
	const builds = await loadBuilds()

	const { items, artifacts, weapons, enemies, characters, enemyGroups } = await extractAllItemsData()

	replaceEnemiesByGroups(enemies.code2item, enemyGroups.code2item)
	for (const group of Object.values(enemyGroups.code2item)) {
		const url = enemies.code2img.get(group.iconEnemyCode)
		if (url) enemies.code2img.set(group.code, url)
		else warn(`group '${group.code}': no icon image '${group.iconEnemyCode}'`)
	}

	const usedArtCodes = new Set(builds.characters.map(x => Array.from(getCharacterArtifactCodes(x))).flat())
	const usedWeaponCodes = new Set(builds.characters.map(x => Array.from(getCharacterWeaponCodes(x))).flat())

	const usedItemCodes = new Set()
	for (const weapon of Object.values(weapons.code2item))
		if (usedWeaponCodes.has(weapon.code)) for (const code of weapon.materialCodes) usedItemCodes.add(code)
	for (const character of Object.values(characters.code2item))
		for (const code of character.materialCodes) usedItemCodes.add(code)

	const usedEmenyCodes = new Set()
	for (const enemy of Object.values(enemies.code2item))
		if (
			enemy.drop.artifactSetCodes.some(x => usedArtCodes.has(x)) ||
			enemy.drop.itemCodes.some(x => usedItemCodes.has(x))
		) {
			usedEmenyCodes.add(enemy.code)
		}

	/**
	 * @param {string} title
	 * @param {() => Promise<{loaded:number, total:number}>} func
	 */
	async function processGroup(title, func) {
		info(`updating ${title} images`, { newline: false })
		const stats = await func()
		info(`  saved ${stats.loaded} of total ${stats.total}`)
	}

	const shouldProcess = async dest => overwriteExisting || !(await exists(dest))
	const resize64 = (i, o) => resize(i, o, '64x64')

	await processGroup('items', async () => {
		const { code2img } = items
		for (const code of code2img.keys()) if (!usedItemCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'items', async code => {
			const dest = `${WWW_MEDIA_DIR}/items/${code}.png`
			if (await shouldProcess(dest)) return src => mediaChain(src, dest, resize64, pngquant, optipng)
		})
	})

	await processGroup('artifacts', async () => {
		const { code2img } = artifacts
		for (const code of code2img.keys()) if (!usedArtCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'artifacts', async code => {
			const dest = `${WWW_MEDIA_DIR}/artifacts/${code}.png`
			if (await shouldProcess(dest)) return src => mediaChain(src, dest, resize64, pngquant, optipng)
		})
	})

	await processGroup('weapons', async () => {
		const { code2img } = weapons
		for (const code of code2img.keys()) if (!usedWeaponCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'weapons', async code => {
			const dest = `${WWW_MEDIA_DIR}/weapons/${code}.png`
			if (await shouldProcess(dest)) return src => mediaChain(src, dest, resize64, pngquant, optipng)
		})
	})

	await processGroup('enemies', async () => {
		const { code2img } = enemies
		for (const code of code2img.keys()) if (!usedEmenyCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'enemies', async code => {
			const dest = `${WWW_MEDIA_DIR}/enemies/${code}.png`
			if (await shouldProcess(dest)) return src => mediaChain(src, dest, resize64, pngquant, optipng)
		})
	})
}

async function saveWwwData() {
	info('updating www JSONs', { newline: false })

	const builds = await loadBuilds()
	const characters = await loadCharacters()
	const enemies = await loadEnemies()
	const artifacts = await loadArtifacts()
	const weapons = await loadWeapons()
	const domains = await loadDomains()
	const items = await loadItems()
	const enemyGroups = await loadEnemyGroups()

	excludeDomainBosses(enemies, domains)

	replaceEnemiesByGroups(enemies, enemyGroups)

	for (const dir of [WWW_STATIC_DIR, WWW_DYNAMIC_DIR]) {
		await fs.rm(dir, { recursive: true, force: true })
		await fs.mkdir(dir, { recursive: true })
	}

	const md5sum = createHash('md5')
	async function writeJson(path, data) {
		const content = JSON.stringify(data)
		await fs.writeFile(path, content)
		md5sum.update(content)
	}
	// async function writeBuffer(path, /**@type {Buffer}*/ content) {
	// 	await fs.writeFile(path, content)
	// 	md5sum.update(content)
	// }

	for (const lang of LANGS) {
		const buildArtifacts = makeArtifactsFullInfo(
			builds.artifacts,
			artifacts,
			domains,
			enemies,
			builds.characters,
			lang,
		)
		const buildWeapons = makeWeaponsFullInfo(builds.weapons, weapons, domains, items, lang)

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
		for (const character of builds.characters) {
			const fullInfo = makeCharacterFullInfo(
				character,
				characters,
				buildArtifacts.artifacts,
				buildWeapons.weapons,
				domains,
				enemies,
				items,
				lang,
			)
			const locsInfo = extractFullInfoLocations(fullInfo)
			await writeJson(`${WWW_DYNAMIC_DIR}/characters/${character.code}-locs-${lang}.json`, locsInfo)
			await writeJson(`${WWW_DYNAMIC_DIR}/characters/${character.code}-${lang}.json`, fullInfo)
		}

		await writeJson(`${WWW_DYNAMIC_DIR}/artifacts-${lang}.json`, buildArtifacts)
		await writeJson(`${WWW_DYNAMIC_DIR}/weapons-${lang}.json`, buildWeapons)

		progress()
	}

	await writeJson(`${WWW_DYNAMIC_DIR}/changelogs.json`, builds.changelogsTable)
	await writeJson(
		`${WWW_DYNAMIC_DIR}/changelogs-recent.json`,
		makeRecentChangelogsTable(builds.changelogsTable),
	)

	const hash = md5sum.digest('hex').slice(0, 8)
	await fs.writeFile(
		`${WWW_STATIC_DIR}/index.ts`,
		`
import { apiGetJSONFile, mapAllByCode, MapAllByCode } from '#src/api'

const LANG = 'en'

const get = <T>(prefix:string, signal:AbortSignal) =>
	apiGetJSONFile(\`generated/\${prefix}-\${LANG}.json?v=${hash}\`, signal) as Promise<T>

import type { CharacterShortInfo } from '#lib/parsing/combine'
export const charactersShortList: CharacterShortInfo[] =
	${JSON.stringify(makeCharacterShortList(builds.characters, characters))}

import type { CharacterFullInfoWithRelated } from '#lib/parsing/combine'
export function apiGetCharacter(code:string, signal:AbortSignal): Promise<MapAllByCode<CharacterFullInfoWithRelated>> {
	return (get(\`characters/\${code}\`, signal) as Promise<CharacterFullInfoWithRelated>).then(mapAllByCode)
}

import type { ExtractedLocationsInfo } from '#lib/parsing/combine'
export function apiGetCharacterRelatedLocs(code:string, signal:AbortSignal): Promise<ExtractedLocationsInfo> {
	return get(\`characters/\${code}-locs\`, signal) as Promise<ExtractedLocationsInfo>
}

import type { ArtifactsFullInfoWithRelated } from '#lib/parsing/combine'
export function apiGetArtifacts(signal:AbortSignal): Promise<MapAllByCode<ArtifactsFullInfoWithRelated>> {
	return (get(\`artifacts\`, signal) as Promise<ArtifactsFullInfoWithRelated>).then(mapAllByCode)
}

import type { WeaponsFullInfoWithRelated } from '#lib/parsing/combine'
export function apiGetWeapons(signal:AbortSignal): Promise<MapAllByCode<WeaponsFullInfoWithRelated>> {
	return (get(\`weapons\`, signal) as Promise<WeaponsFullInfoWithRelated>).then(mapAllByCode)
}

import type { ChangelogsTable } from '#lib/parsing/helperteam/changelogs'
export function apiGetChangelogs(onlyRecent:boolean, signal:AbortSignal): Promise<ChangelogsTable> {
	return get(\`changelogs\${onlyRecent ? '-recent' : ''}\`, signal)
}`,
	)
	progress()
}
