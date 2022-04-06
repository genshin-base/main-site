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
import { trigramSearcherFromStrings } from '#lib/trigrams.js'
import { createHash } from 'crypto'
import { exists, parseArgs, relativeToCwd } from '#lib/utils/os.js'
import { fatal, info, progress, warn } from '#lib/utils/logs.js'
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
	WWW_API_FILE,
	TRANSLATED_DATA_DIR,
	loadTranslatedBuilds,
} from './_common.js'
import { mediaChain, optipng, pngquant, resize } from '#lib/media.js'
import {
	excludeDomainBosses,
	extractFullInfoLocations,
	makeArtifactsFullInfo,
	makeCharacterFullInfo,
	makeCharacterShortList,
	makeMaterialsTimetable,
	makeWeaponsFullInfo,
} from '#lib/parsing/combine.js'
import {
	applyItemTypesByWeapons,
	extractItemsData,
	getItemAncestryCodes,
} from '#lib/parsing/honeyhunter/items.js'
import {
	extractEnemiesData,
	makeEnemyGroups,
	replaceEnemiesByGroups,
} from '#lib/parsing/honeyhunter/enemies.js'
import { applyWeaponsObtainData } from '#lib/parsing/wiki/weapons.js'
import { applyItemsLocations } from '#lib/parsing/mihoyo/map.js'
import { checkMihoyoFixesUsage, clearMihoyoFixesUsage } from '#lib/parsing/mihoyo/fixes.js'
import { applyDomainsRegion } from '#lib/parsing/wiki/domains.js'
import { applyCharactersReleaseVersion } from '#lib/parsing/wiki/characters.js'
import { getEnemyCodeFromName } from '#lib/genshin.js'
import { getArtifactSpecialGroupCodes } from '#lib/parsing/honeyhunter/artifacts.js'
import { buildsConvertLangMode } from '#lib/parsing/helperteam/build_texts.js'

const HELPERTEAM_DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

const LANGS = ['en', 'ru']

const fixes = {
	/** @type {import('#lib/parsing/helperteam/fixes').HelperteamFixes} */
	helperteam: {
		roleNotes: [{ character: 'kaeya', role: 'cryo dps', searchAs: 'dps' }],
		sheets: [
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
			// некоторые персонажи и предметы почему-то находятся в таблице нерелизнутого
			characters: [],
			weapons: [{ actually: 'released', name: 'Calamity Queller' }],
		},
		travelerLangNames: {
			anemo: {
				en: 'Anemo Traveler',
				ru: 'Анемо Путешественница',
			},
			geo: {
				en: 'Geo Traveler',
				ru: 'Гео Путешественница',
			},
			electro: {
				en: 'Electro Traveler',
				ru: 'Электро Путешественница',
			},
		},
		skipEnemies: [
			/^Millelith/i, //
			/^Treasure Hoarders - Boss$/,
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
		domainMissingLocations: [],
		postProcess: {
			items: (() => {
				/**
				 * @param {string} code
				 * @param {import('#lib/parsing').ItemType} type
				 */
				function addItemType(code, type) {
					return (/**@type {import('#lib/parsing').Code2ItemData}*/ code2item) => {
						if (!code2item[code] || code2item[code].types.includes(type)) return false
						code2item[code].types.push(type)
						return true
					}
				}
				return [
					// некоторые предметы используются для прокачки, но почему-то отсутствуют на
					// https://genshin.honeyhunterworld.com/db/item/character-ascension-material-local-material/
					addItemType('spectral-nucleus', 'character-material-secondary'),
					addItemType('spectral-heart', 'character-material-secondary'),
					addItemType('spectral-husk', 'character-material-secondary'),
					addItemType('dendrobium', 'character-material-local'),
					addItemType('onikabuto', 'character-material-local'),
				]
			})(),
			enemies: [
				// Стаи вишапов нет ни в списке врагов, ни в списке данжей
				(code2enemy, code2img) => {
					// https://genshin.honeyhunterworld.com/db/item/i_216/?lang=EN
					const name = {
						en: 'Bathysmal Vishap Herd',
						ru: 'Стая вишапов глубин',
					}
					// https://genshin-impact.fandom.com/wiki/Coral_Defenders
					const code = getEnemyCodeFromName(name.en)
					const artifactSetCodes = ['lucky-dog', 'the-exile', 'berserker', 'prayers-to-springtime', 'gladiators-finale', 'wanderers-troupe'] //prettier-ignore
					const itemCodes = ['dragonheirs-false-fin', 'shivada-jade-gemstone', 'vajrada-amethyst-gemstone'] //prettier-ignore
					const img =
						'https://uploadstatic.mihoyo.com/ys-obc/2021/12/06/75379475/0d7fe8f319459a12e082eb96ab06060e_5630470111967973966.png'

					if (code in code2enemy) return false
					code2enemy[code] = { code, name, drop: { artifactSetCodes, itemCodes }, locations: [] }
					code2img.set(code, img)
					return true
				},
			],
			domains: [],
		},
		descriptionLangFix(text, lang) {
			if (lang === 'ru') {
				text = text.replace(/\bHP\b/g, 'ХП')
			}
			return text
		},
	},
	/** @type {import('#lib/parsing/mihoyo/fixes').MihoyoFixes} */
	mihoyo: {
		enemiesOnMap: [
			{ nameOnMap: 'Fatui Agent', useCode: 'fatui-pyro-agent' },
			{ nameOnMap: 'Fatui Mirror Maiden', useCode: 'mirror-maiden' },
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
		// await checkUsedItemsLocations()
	}
	if (updImgs) {
		await prepareCacheDir(IMGS_CACHE_DIR, !!args['--ignore-cache'])
		await extractAndSaveItemImages(!!args['--force'])
	}
	if (updWww) await saveWwwData()

	info('done.')
	// setTimeout(() => {}, 1000000)
})().catch(fatal)

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
		HELPERTEAM_DOC_ID,
		[
			'sheets.properties',
			'sheets.data.rowData.values.userEnteredValue',
			'sheets.data.rowData.values.userEnteredFormat.textFormat',
			'sheets.data.rowData.values.textFormatRuns',
		],
	)
	progress()

	clearHelperteamFixesUsage(fixes.helperteam)
	const builds = await extractBuilds(spreadsheet, knownCodes, fixes.helperteam)
	checkHelperteamFixesUsage(fixes.helperteam)

	await fs.mkdir(DATA_DIR, { recursive: true })
	await saveBuilds(builds)
	progress()
}

async function extractAllItemsData() {
	const cd = DATA_CACHE_DIR
	const hhfx = fixes.honeyhunter
	clearHoneyhunterFixesUsage(hhfx)
	clearMihoyoFixesUsage(fixes.mihoyo)

	const items = await extractItemsData(cd, LANGS, hhfx)
	const artifacts = await extractArtifactsData(cd, LANGS, hhfx)
	const weapons = await extractWeaponsData(cd, LANGS, items.id2item, hhfx)
	const enemies = await extractEnemiesData(cd, LANGS, items.id2item, artifacts.id2item, hhfx)
	const domains = await extractDomainsData(cd, LANGS, items.id2item, artifacts.id2item, enemies.id2item, hhfx) //prettier-ignore
	const characters = await extractCharactersData(cd, LANGS, items.id2item, hhfx)
	const enemyGroups = makeEnemyGroups(enemies.code2item, fixes.honeyhunter)

	await applyCharactersReleaseVersion(cd, characters.code2item)
	await applyWeaponsObtainData(cd, weapons.code2item)
	await applyItemsLocations(cd, enemies.code2item, enemyGroups.code2item, items.code2item, fixes.mihoyo)
	await applyItemTypesByWeapons(items.code2item, weapons.code2item)
	await applyDomainsRegion(cd, domains.code2item)

	checkHoneyhunterFixesUsage(hhfx)
	checkMihoyoFixesUsage(fixes.mihoyo)
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

	info('extracting data', { newline: false })
	const { items, artifacts, weapons, enemies, characters, enemyGroups } = await extractAllItemsData()
	const artGroupCodes = getArtifactSpecialGroupCodes(artifacts.code2item)

	replaceEnemiesByGroups(enemies.code2item, enemyGroups.code2item)
	for (const group of Object.values(enemyGroups.code2item)) {
		const url = enemies.code2img.get(group.iconEnemyCode)
		if (url) enemies.code2img.set(group.code, url)
		else warn(`group '${group.code}': no icon image '${group.iconEnemyCode}'`)
	}

	const usedArtCodes = new Set(
		builds.characters.map(x => [...getCharacterArtifactCodes(x, artGroupCodes)]).flat(),
	)
	const usedWeaponCodes = new Set(builds.characters.map(x => [...getCharacterWeaponCodes(x)]).flat())

	const usedItemCodes = new Set()
	for (const character of Object.values(characters.code2item))
		for (const code of character.materialCodes) usedItemCodes.add(code)
	for (const weapon of Object.values(weapons.code2item))
		if (usedWeaponCodes.has(weapon.code)) for (const code of weapon.materialCodes) usedItemCodes.add(code)
	for (const item of Object.values(items.code2item))
		if (usedItemCodes.has(item.code))
			for (const code of getItemAncestryCodes(item, items.code2item)) usedItemCodes.add(code)

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
	const processNormal = (i, o) => mediaChain(i, o, (i, o) => resize(i, o, '64x64'), pngquant, optipng)
	const processLarge = (i, o) => mediaChain(i, o, (i, o) => resize(i, o, '120x120'), pngquant, optipng)
	async function* processIfShould(mediaFPath, mediaFunc) {
		const dest = `${WWW_MEDIA_DIR}/${mediaFPath}`
		if (await shouldProcess(dest)) yield src => mediaFunc(src, dest)
	}

	await processGroup('items', async () => {
		const { code2img } = items
		for (const code of code2img.keys()) if (!usedItemCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'items', async function* (code) {
			yield* processIfShould(`items/${code}.png`, processNormal)
			yield* processIfShould(`items/${code}.large.png`, processLarge)
		})
	})

	await processGroup('artifacts', async () => {
		const { code2img } = artifacts
		for (const code of code2img.keys()) if (!usedArtCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'artifacts', async function* (code) {
			yield* processIfShould(`artifacts/${code}.png`, processNormal)
			yield* processIfShould(`artifacts/${code}.large.png`, processLarge)
		})
	})

	await processGroup('weapons', async () => {
		const { code2img } = weapons
		for (const code of code2img.keys()) if (!usedWeaponCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'weapons', async function* (code) {
			yield* processIfShould(`weapons/${code}.png`, processNormal)
			yield* processIfShould(`weapons/${code}.large.png`, processLarge)
		})
	})

	await processGroup('enemies', async () => {
		const { code2img } = enemies
		for (const code of code2img.keys()) if (!usedEmenyCodes.has(code)) code2img.delete(code)

		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'enemies', async function* (code) {
			yield* processIfShould(`enemies/${code}.png`, processNormal)
		})
	})
}

/*
async function checkUsedItemsLocations() {
	const builds = await loadBuilds()
	const characters = await loadCharacters()
	const enemies = await loadEnemies()
	const artifacts = await loadArtifacts()
	const weapons = await loadWeapons()
	const domains = await loadDomains()
	const items = await loadItems()
	const enemyGroups = await loadEnemyGroups()

	excludeDomainBosses(enemies, domains)

	for (const group of Object.values(enemyGroups))
		if (group.locations.length === 0) warn(`enemy group '${group.code}' has no locations`)

	const enemiesInGroups = new Set()
	for (const group of Object.values(enemyGroups))
		for (const code of group.enemyCodes) enemiesInGroups.add(code)
	for (const enemy of Object.values(enemies))
		if (!enemiesInGroups.has(enemy.code) && enemy.locations.length === 0)
			warn(`enemy '${enemy.code}' has no locations`)

	const dropCodes = new Set()
	for (const enemy of Object.values(enemies)) for (const code of enemy.drop.itemCodes) dropCodes.add(code)
	for (const domain of Object.values(domains)) for (const code of domain.drop.itemCodes) dropCodes.add(code)
	for (const item of Object.values(items)) {
		if (dropCodes.has(item.code)) continue
		if (!item.types.some(x => x !== 'currency' && x !== 'ingredient')) continue
		if (item.locations.length > 0) continue
		warn(`item '${item.code}' has no locations`)
	}
}
*/

async function saveWwwData() {
	info('updating www JSONs', { newline: false })

	const characters = await loadCharacters()
	const enemies = await loadEnemies()
	const artifacts = await loadArtifacts()
	const weapons = await loadWeapons()
	const domains = await loadDomains()
	const items = await loadItems()
	const enemyGroups = await loadEnemyGroups()

	const artGroupCodes = getArtifactSpecialGroupCodes(artifacts)

	const builds = await (async () => {
		if (await exists(TRANSLATED_DATA_DIR)) {
			return await loadTranslatedBuilds()
		} else {
			warn('data/translations not exists, using parsed english version')
			return buildsConvertLangMode(await loadBuilds(), 'multilang', en =>
				en === null ? {} : Object.fromEntries(LANGS.map(lang => [lang, en])),
			)
		}
	})()

	excludeDomainBosses(enemies, domains)

	replaceEnemiesByGroups(enemies, enemyGroups)

	await fs.rm(WWW_DYNAMIC_DIR, { recursive: true, force: true })
	await fs.mkdir(WWW_DYNAMIC_DIR, { recursive: true })

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
		const buildArtifacts = makeArtifactsFullInfo(artifacts, characters, domains, enemies, builds.characters, lang) //prettier-ignore
		const buildWeapons = makeWeaponsFullInfo(weapons, characters, domains, items, builds.characters, lang) //prettier-ignore

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
		for (const character of builds.characters) {
			const fullInfo = makeCharacterFullInfo(
				character, characters, buildArtifacts.artifacts, buildWeapons.weapons,
				domains, enemies, items, artGroupCodes, lang) //prettier-ignore
			const locsInfo = extractFullInfoLocations(fullInfo)
			await writeJson(`${WWW_DYNAMIC_DIR}/characters/${character.code}-locs-${lang}.json`, locsInfo)
			await writeJson(`${WWW_DYNAMIC_DIR}/characters/${character.code}-${lang}.json`, fullInfo)
		}

		await writeJson(`${WWW_DYNAMIC_DIR}/artifacts-${lang}.json`, buildArtifacts)
		await writeJson(`${WWW_DYNAMIC_DIR}/weapons-${lang}.json`, buildWeapons)

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/timetables`, { recursive: true })
		const timetable = makeMaterialsTimetable(characters, domains, weapons, enemies, items, lang)
		await writeJson(`${WWW_DYNAMIC_DIR}/timetables/materials-${lang}.json`, timetable)

		progress()
	}

	const hash = md5sum.digest('hex').slice(0, 8)
	const charactersShortInfo = makeCharacterShortList(builds.characters, characters)
	await fs.writeFile(
		WWW_API_FILE,
		`
export const GENERATED_DATA_HASH = ${JSON.stringify(hash)}

/** @type {import('#lib/parsing/combine').CharacterShortInfo[]} */
export const charactersShortList = ${JSON.stringify(charactersShortInfo, null, '\t')}

/** @type {import('#lib/parsing').ArtifcatSetGroupsCodes} */
export const ART_GROUP_CODES = ${JSON.stringify(artGroupCodes, null, '\t')}
`,
	)
	progress()
}
