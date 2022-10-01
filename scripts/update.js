#!/usr/bin/env node
import { promises as fs } from 'fs'
import { extractBuilds } from '#lib/parsing/helperteam/index.js'
import { loadSpreadsheetCached } from '#lib/google.js'
import { json_getText } from '#lib/parsing/helperteam/text-json.js'
import {
	extractCharactersData,
	extractDomainsData,
	extractWeaponsData,
	getAndProcessMappedImages,
} from '#lib/parsing/honeyhunter/index.js'
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
	BUILDS_CACHE_DIR,
	saveAbyssStats,
	loadAbyssStats,
} from './_common.js'
import { mediaChain, optipng, pngquant, resize } from '#lib/media.js'
import {
	excludeDomainBosses,
	extractFullInfoLocations,
	makeArtifactFullInfoWithRelated,
	makeArtifactsRegularInfo,
	makeCharacterFullInfo,
	makeCharacterShortList,
	makeMaterialsTimetable,
	makeSearchData,
	makeWeaponFullInfoWithRelated,
	makeWeaponsRegularInfo,
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
import { applyCharactersReleaseVersion } from '#lib/parsing/wiki/characters.js'
import { getEnemyCodeFromName } from '#lib/genshin.js'
import { extractArtifactsData, getArtifactSpecialGroupCodes } from '#lib/parsing/honeyhunter/artifacts.js'
import { buildsConvertLangMode } from '#lib/parsing/helperteam/build_texts.js'
import { extractAbyssStats } from '#lib/parsing/spiralabyss/index.js'

const HELPERTEAM_DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

const LANGS = ['en', 'ru']

const fixes = {
	/** @type {import('#lib/parsing/helperteam/fixes').HelperteamFixes} */
	helperteam: {
		roleNotes: [
			{ character: 'kaeya', role: 'cryo dps', searchAs: 'dps' },
			{ character: 'tighnari', role: 'quick swap dps', searchAs: 'quickswap dps' },
		],
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
			{
				// У Син Цю почти все советы для роли "С0-5" совпадают с ролью "С6", и повторно не прописаны.
				// Здесь всё из строки "С6" копируется на пустые места в "С0-5".
				title: /^hydro$/i,
				fixFunc(sheet) {
					let c6Cells, c5Cells
					for (const { values: cells = [] } of sheet.data[0].rowData) {
						for (const cell of cells) {
							const text = json_getText(cell).trim().toLocaleLowerCase()
							if (text.startsWith('off-field dps (c6)')) c6Cells = cells
							if (text.startsWith('off-field dps (c0-c5)')) c5Cells = cells
							if (c6Cells && c5Cells) break
						}
					}
					if (!c6Cells || !c5Cells) return false
					let copiedSmth = false
					for (let i = 0; i < c6Cells.length; i++) {
						if (!c5Cells.at(i) || json_getText(c5Cells[i]).trim() === '') {
							c5Cells[i] = c6Cells[i]
							copiedSmth = true
						}
					}
					return copiedSmth
				},
			},
		],
	},
	/** @type {import('#lib/parsing/honeyhunter/fixes').HoneyhunterFixes} */
	honeyhunter: {
		statuses: {
			// некоторые персонажи и предметы почему-то находятся в таблице нерелизнутого
			characters: [],
			weapons: [
				{ actually: 'unreleased', name: 'Ebony Bow' },
				{ actually: 'unreleased', name: 'Quartz' },
				{ actually: 'unreleased', name: 'Amber Bead' },
				// это оружие из квеста, получаемое после квеста оружие называется "Kagotsurube Isshin"
				{ actually: 'unreleased', name: 'Prized Isshin Blade' },
			],
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
			dendro: {
				en: 'Dendro Traveler',
				ru: 'Дендро Путешественница',
			},
		},
		skip: {
			enemies: [
				/^Eremite/i, //
			],
			artifacts: [],
			items: [
				/^Festive Fever$/, //два предмета с одинаковым названием (и поэтому одинаковым кодом), пока всё равно не нужны
			],
		},
		manualEnemyGroups: [
			{ origNames: /^Ruin Guard$/ },
			{ origNames: /^Ruin Hunter$/ },
			{ origNames: /^Ruin Grader$/ },
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
			{
				origNames: /^Abyss (Herald|Lector)/,
				name: { en: 'Abyss Herald', ru: 'Вестник Бездны' },
			},
			{
				origNames: /^Ruin Drake/,
				name: { en: 'Ruin Drake', ru: 'Дракон руин' },
			},
		],
		domainMissingLocations: [
			// найденные вручную (точные)
			{ code: 'momiji-dyed-court', location: { mapCode: 'teyvat', x: 1619, y: 6098 } },
			{ code: 'slumbering-court', location: { mapCode: 'teyvat', x: 3463, y: 6619 } },
			{ code: 'violet-court', location: { mapCode: 'teyvat', x: 3187, y: 5529 } },
			{ code: 'narukami-island-tenshukaku', location: { mapCode: 'teyvat', x: 3812, y: 5677 } },
			{ code: 'court-of-flowing-sand', location: { mapCode: 'teyvat', x: 3657, y: 4725 } },
			{ code: 'beneath-the-dragon-queller', location: { mapCode: 'teyvat', x: -2504, y: 1722 } },
			// найденные вручную (не очень точные)
			{ code: 'spire-of-solitary-enlightenment', location: { mapCode: 'teyvat', x: -2960, y: 2886 } },
			{ code: 'steeple-of-ignorance', location: { mapCode: 'teyvat', x: -3763, y: 2415 } },
			{ code: 'tower-of-abject-pride', location: { mapCode: 'teyvat', x: -4222, y: 4072 } },
			// от хонихантеров (не очень точные)
			{ code: 'cecilia-garden', location: { mapCode: 'teyvat', x: -513, y: 79 } },
			{ code: 'clear-pool-and-mountain-cavern', location: { mapCode: 'teyvat', x: -2181, y: 1045 } },
			{ code: 'confront-stormterror', location: { mapCode: 'teyvat', x: -883, y: -316 } },
			{ code: 'domain-of-guyun', location: { mapCode: 'teyvat', x: 215, y: 2630 } },
			{ code: 'end-of-the-oneiric-euthymia', location: { mapCode: 'teyvat', x: 3654, y: 4821 } },
			{ code: 'enter-the-golden-house', location: { mapCode: 'teyvat', x: -1002, y: 3243 } },
			{ code: 'forsaken-rift', location: { mapCode: 'teyvat', x: 143, y: 657 } },
			{ code: 'hidden-palace-of-lianshan-formula', location: { mapCode: 'teyvat', x: -334, y: 1600 } },
			{ code: 'hidden-palace-of-zhou-formula', location: { mapCode: 'teyvat', x: -1145, y: 643 } },
			{ code: 'midsummer-courtyard', location: { mapCode: 'teyvat', x: 809, y: -153 } },
			{ code: 'peak-of-vindagnyr', location: { mapCode: 'teyvat', x: 75, y: 1297 } },
			{ code: 'ridge-watch', location: { mapCode: 'teyvat', x: -430, y: 868 } },
			{ code: 'taishan-mansion', location: { mapCode: 'teyvat', x: -1919, y: 1677 } },
			{ code: 'the-lost-valley', location: { mapCode: 'teyvat', x: -2647, y: 2811 } },
			{ code: 'valley-of-remembrance', location: { mapCode: 'teyvat', x: -89, y: 637 } },
		],
		postProcess: {
			items: (() => {
				return []
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
			weapons: (() => {
				function removeSlashNs(attrFunc) {
					return code2weapon => {
						let used = false
						const attr = attrFunc(code2weapon)
						for (const [lang, text] of Object.entries(attr)) {
							const newText = text.replace('\\n', ' ')
							if (newText !== text) used = true
							attr[lang] = newText
						}
						return used
					}
				}
				return [
					// у некоторых оружий в описании встречаются "\n" (двумя символами)
					removeSlashNs(code2weapon => code2weapon['predator'].specialAbility),
					removeSlashNs(code2weapon => code2weapon['sword-of-descension'].specialAbility),
				]
			})(),
			characters: (() => {
				function setMaterialCodes(characterCode, materialCodes) {
					return code2character => {
						if (code2character[characterCode].materialCodes.length > 0) return false
						code2character[characterCode].materialCodes = materialCodes
						return true
					}
				}
				return [
					code2character => {
						if (code2character['aloy'].rarity === 5) return false
						code2character['aloy'].rarity = 5
						return true
					},
					setMaterialCodes('traveler-anemo', [
						'philosophies-of-ballad',
						'philosophies-of-freedom',
						'philosophies-of-resistance',
						'dvalins-sigh',
						'brilliant-diamond-gemstone',
						'windwheel-aster',
						'forbidden-curse-scroll',
						'ominous-mask',
					]),
					setMaterialCodes('traveler-geo', [
						'philosophies-of-ballad',
						'philosophies-of-diligence',
						'philosophies-of-freedom',
						'philosophies-of-gold',
						'philosophies-of-prosperity',
						'philosophies-of-resistance',
						'dvalins-sigh',
						'tail-of-boreas',
						'brilliant-diamond-gemstone',
						'windwheel-aster',
						'forbidden-curse-scroll',
						'ominous-mask',
						'weathered-arrowhead',
					]),
					setMaterialCodes('traveler-electro', [
						'philosophies-of-elegance',
						'philosophies-of-light',
						'philosophies-of-transience',
						'dragon-lords-crown',
						'brilliant-diamond-gemstone',
						'windwheel-aster',
						'famed-handguard',
						'ominous-mask',
					]),
					setMaterialCodes('traveler-dendro', [
						'philosophies-of-admonition',
						'philosophies-of-ingenuity',
						'philosophies-of-praxis',
						'mudra-of-the-malefic-general',
						'brilliant-diamond-gemstone',
						'windwheel-aster',
						'ominous-mask',
						'crystalline-cyst-dust',
					]),
				]
			})(),
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
			{ nameOnMap: 'The Black Serpents', useCode: 'shadowy-husk' },
			{ nameOnMap: 'Red-Finned Unagi', useCode: 'unagi' },
			{ nameOnMap: 'Adorned Unagi', useCode: 'unagi' },
			{ nameOnMap: 'Fungi', useCode: 'fungus' },
		],
	},
}

const args = parseArgs()

function printUsage() {
	console.log(`Usage:
  node ${relativeToCwd(process.argv[1])} [data|builds|www|images] [-h|--help] [--force] [--ignore-cache]`)
}

if (args['--help'] || args['-h']) {
	printUsage()
	process.exit(2)
}

;(async () => {
	const updBuilds = [undefined, 'builds'].includes(args['cmd'])
	const updData = [undefined, 'data'].includes(args['cmd'])
	const updAbyssData = [undefined, 'data', 'abyss-data'].includes(args['cmd'])
	const updImgs = [undefined, 'images'].includes(args['cmd'])
	const updWww = [undefined, 'www'].includes(args['cmd'])

	if (updBuilds) {
		await prepareCacheDir(BUILDS_CACHE_DIR, !!args['--ignore-cache'])
		await extractAndSaveBuildsData()
	}
	if (updData) {
		await prepareCacheDir(DATA_CACHE_DIR, !!args['--ignore-cache'])
		await extractAndSaveAllItemsData()
		// await checkUsedItemsLocations()
	}
	if (updAbyssData) {
		info('updating abyss stats', { newline: false })
		await fs.mkdir(DATA_DIR, { recursive: true })
		const code2character = await loadCharacters()
		const abyssStats = await extractAbyssStats(DATA_CACHE_DIR, code2character)
		await saveAbyssStats(abyssStats)
		progress()
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
		`${BUILDS_CACHE_DIR}/spreadsheet.json`,
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
	info('extracting data', { newline: false })
	const { items, artifacts, weapons, enemies, characters, enemyGroups } = await extractAllItemsData()

	replaceEnemiesByGroups(enemies.code2item, enemyGroups.code2item)
	for (const group of Object.values(enemyGroups.code2item)) {
		const url = enemies.code2img.get(group.iconEnemyCode)
		if (url) enemies.code2img.set(group.code, url)
		else warn(`group '${group.code}': no icon image '${group.iconEnemyCode}'`)
	}

	const usedItemCodes = new Set()
	for (const character of Object.values(characters.code2item))
		for (const code of character.materialCodes) usedItemCodes.add(code)
	for (const weapon of Object.values(weapons.code2item))
		for (const code of weapon.materialCodes) usedItemCodes.add(code)
	for (const item of Object.values(items.code2item))
		if (usedItemCodes.has(item.code))
			for (const code of getItemAncestryCodes(item, items.code2item)) usedItemCodes.add(code)

	const usedEmenyCodes = new Set()
	for (const enemy of Object.values(enemies.code2item))
		if (
			enemy.drop.artifactSetCodes.some(x => x in artifacts.code2item) ||
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
		return await getAndProcessMappedImages(code2img, IMGS_CACHE_DIR, 'artifacts', async function* (code) {
			yield* processIfShould(`artifacts/${code}.png`, processNormal)
			yield* processIfShould(`artifacts/${code}.large.png`, processLarge)
		})
	})

	await processGroup('weapons', async () => {
		const { code2img } = weapons
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

async function saveWwwData() {
	info('updating www JSONs', { newline: false })

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

	/** @type {import('#lib/parsing/combine').CommonData} */
	const common = {
		builds,
		code2character: await loadCharacters(),
		code2enemy: await loadEnemies(),
		code2artifact: await loadArtifacts(),
		code2weapon: await loadWeapons(),
		code2domain: await loadDomains(),
		code2item: await loadItems(),
		enemyGroups: await loadEnemyGroups(),
		_cache: new Map(),
	}

	excludeDomainBosses(common.code2enemy, common.code2domain)

	replaceEnemiesByGroups(common.code2enemy, common.enemyGroups)

	await fs.rm(WWW_DYNAMIC_DIR, { recursive: true, force: true })
	await fs.mkdir(WWW_DYNAMIC_DIR, { recursive: true })

	const md5sum = createHash('md5')
	async function writeJson(path, data) {
		const content = JSON.stringify(data)
		await fs.writeFile(path, content)
		md5sum.update(content)
	}

	for (const lang of LANGS) {
		const buildArtifacts = makeArtifactsRegularInfo(common, lang)
		const buildWeapons = makeWeaponsRegularInfo(common, lang)

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/characters`, { recursive: true })
		for (const character of builds.characters) {
			const fullInfo = makeCharacterFullInfo(character, common, buildArtifacts, buildWeapons, lang)
			const locsInfo = extractFullInfoLocations(fullInfo)
			await writeJson(`${WWW_DYNAMIC_DIR}/characters/${character.code}-locs-${lang}.json`, locsInfo)
			await writeJson(`${WWW_DYNAMIC_DIR}/characters/${character.code}-${lang}.json`, fullInfo)
		}

		await fs.mkdir(`${WWW_DYNAMIC_DIR}/timetables`, { recursive: true })
		const timetable = makeMaterialsTimetable(common, lang)
		await writeJson(`${WWW_DYNAMIC_DIR}/timetables/materials-${lang}.json`, timetable)

		await writeJson(`${WWW_DYNAMIC_DIR}/artifacts-${lang}.json`, buildArtifacts)
		await fs.mkdir(`${WWW_DYNAMIC_DIR}/artifacts`, { recursive: true })
		for (const artifact of Object.values(common.code2artifact)) {
			const artifactInfo = makeArtifactFullInfoWithRelated(artifact, common, lang)
			await writeJson(`${WWW_DYNAMIC_DIR}/artifacts/${artifact.code}-${lang}.json`, artifactInfo)
		}

		await writeJson(`${WWW_DYNAMIC_DIR}/weapons-${lang}.json`, buildWeapons)
		await fs.mkdir(`${WWW_DYNAMIC_DIR}/weapons`, { recursive: true })
		for (const weapon of Object.values(common.code2weapon)) {
			const weaponInfo = makeWeaponFullInfoWithRelated(weapon, common, lang)
			await writeJson(`${WWW_DYNAMIC_DIR}/weapons/${weapon.code}-${lang}.json`, weaponInfo)
		}

		await writeJson(`${WWW_DYNAMIC_DIR}/search-${lang}.json`, makeSearchData(common, lang))

		progress()
	}

	const abyssStats = await loadAbyssStats()
	/** @type {import('#lib/parsing/combine').AbyssStatsInfo} */
	const abyssStatsInfo = {
		mostUsedCharacters: abyssStats.mostUsedCharacters,
		mostUsedTeams: abyssStats.mostUsedTeams,
	}
	await writeJson(`${WWW_DYNAMIC_DIR}/abyss_stats.json`, abyssStatsInfo)

	const artGroupCodes = getArtifactSpecialGroupCodes(common.code2artifact)

	const hash = md5sum.digest('hex').slice(0, 8)
	const charactersShortInfo = makeCharacterShortList(builds.characters, common.code2character)
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
