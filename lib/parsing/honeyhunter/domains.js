import { getDomainCodeFromName, GI_ROTATION_WEEKDAY_CODES } from '#lib/genshin.js'
import { arrPushIfNew, arrSimpleUniq, sortObject } from '#lib/utils/collections.js'
import { tryWithContext, warn } from '#lib/utils/logs.js'
import { capitaliseFirst } from '#lib/utils/strings.js'
import { mustBeDefined } from '#lib/utils/values.js'
import { getTextContent, mustFindNodeByClass, mustFindNodeHrefMatch, searchNodeWithTag } from '#lib/xml.js'
import {
	getHoneyPage,
	addLangItem,
	ensureSame,
	makeLangMap,
	mustGetJSTableRows,
	mustGetIdAndName,
	mustGetItemOrArtSet,
	mustParseJSTableHeder,
	mustParsesJSTableScriptRows,
} from './common.js'
import { applyItemsPostFixes } from './fixes.js'

/** @typedef {{weekday:import('#lib/genshin').WeekdayCode, drop:{itemCodes:string[]}}} DomainRawRotation */

/** @typedef {{id:string, name:string, type:import('#lib/parsing').DomainTypeCode, bossCode:string|null, dropItemCodes:string[], dropArtSetCodes:string[]}} DomainLang */

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {Map<string, import('#lib/parsing').ArtifactSetData>} id2artSet
 * @param {Map<string, import('#lib/parsing').EnemyData>} id2enemy
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{code2item:import('#lib/parsing').Code2DomainData}>}
 */
export async function extractDomainsData(cacheDir, langs, id2item, id2artSet, id2enemy, fixes) {
	const id2domain = /**@type {import('./common').IdLangMap<DomainLang>}*/ (new Map())
	const add = (page, /**@type {import('#lib/parsing').DomainTypeCode}*/ type) =>
		parseDomainsGroupPage(cacheDir, langs, id2domain, page, type, id2item, id2artSet, id2enemy, fixes)
	await add('dcat_1', 'artifacts')
	await add('dcat_2', 'weapons')
	await add('dcat_10', 'talents')
	await add('dcat_1006', 'trounce')

	for (const [id, domain] of id2domain.entries()) {
		if (domain.en.name === 'n/a') id2domain.delete(id)
	}

	const stageId2region = /**@type {Map<String,import("#lib/genshin").GI_RegionCode>}*/ (new Map())
	await parseDomainsRegionPage(cacheDir, stageId2region, 'lcat_1', 'mondstadt')
	await parseDomainsRegionPage(cacheDir, stageId2region, 'lcat_2', 'liyue')
	await parseDomainsRegionPage(cacheDir, stageId2region, 'lcat_3', 'inazuma')
	await parseDomainsRegionPage(cacheDir, stageId2region, 'lcat_4', 'sumeru')

	const code2id = {}
	const domains = /**@type {import('#lib/parsing').Code2DomainData}*/ ({})
	id2domain.forEach((domain, id) => {
		const code = getDomainCodeFromName(domain.en.name)
		domains[code] = {
			code,
			type: ensureSame(domain, 'type'),
			name: makeLangMap(domain, 'name'),
			drop: {
				itemCodes: ensureSame(domain, 'dropItemCodes'),
				artifactSetCodes: ensureSame(domain, 'dropArtSetCodes'),
			},
			dropTimetable: {},
			region: 'mondstadt',
			location: { mapCode: 'teyvat', x: 0, y: 0 },
			bossCode: ensureSame(domain, 'bossCode'),
		}
		code2id[code] = ensureSame(domain, 'id')
	})
	sortObject(domains, ([, a], [, b]) => a.type.localeCompare(b.type) || a.code.localeCompare(b.code))

	for (const domain of Object.values(domains)) {
		const root = await getHoneyPage('d_' + code2id[domain.code], cacheDir, 'en')

		tryWithContext(`domain '${domain.code}'`, 'skipping', null, setPrefix => {
			// расположение
			const fix = fixes.domainMissingLocations.find(x => x.code === domain.code)
			if (fix) {
				domain.location = fix.location
				fix._used = true
			} else {
				warn(`domain '${domain.code}': location not found, using {${Object.values(domain.location)}}`)
			}

			// список дропа
			if (searchNodeWithTag(root, 'h2', node => getTextContent(node).trim() === 'Drop Rotation')) {
				const dayNames = 'monday tuesday wednesday thursday friday saturday sunday'.split(' ')
				for (const dayName of dayNames) {
					tryWithContext(`domain '${domain.code}': ${dayName}`, 'skipping', null, setPrefix => {
						const dayCode = /**@type {import("#lib/genshin").WeekdayCode}*/ (dayName.slice(0, 3))
						const dayRe = new RegExp(`^${capitaliseFirst(dayName)}$`)
						const table = mustGetJSTableRows(root, dayRe, 'section-table')
						const itemCodes = /**@type {string[]}*/ ([])
						table.rows.map((cells, rowIndex) => {
							const nameCell = cells[table.mustGetColIndex('Name')]
							const { id } = mustGetIdAndName(nameCell, /\/i_(n?\d+)/, rowIndex)
							const item = id2item.get(id)
							if (item) itemCodes.push(item.code)
							else warn(`domain '${domain.code}': unknown drop item #${id}`)
						})
						domain.dropTimetable[dayCode] = { itemCodes }
					})
				}
				for (const drop of Object.values(domain.dropTimetable)) {
					drop.itemCodes.sort()
				}
				sortObject(
					// @ts-ignore
					domain.dropTimetable,
					([wd0], [wd1]) =>
						GI_ROTATION_WEEKDAY_CODES.indexOf(wd0) - GI_ROTATION_WEEKDAY_CODES.indexOf(wd1),
				)
			}

			// регион (по лвлам данжа)
			tryWithContext(`domain '${domain.code}' region`, 'skipping', null, () => {
				const foundSection = searchNodeWithTag(root, 'section', node => node.attrs.id === 'stages')
				if (!foundSection) throw new Error('stages section not found')
				const foundTable = mustFindNodeByClass(foundSection.node, 'genshin_table')
				const header = mustParseJSTableHeder(foundTable)
				const rows = mustParsesJSTableScriptRows(foundTable)
				const nameIndex = header.mustGetColIndex('Name')
				const stageIds = rows.map(
					(cells, i) => mustGetIdAndName(cells[nameIndex], /\/dl_(\d+)/, i).id,
				)
				const regions = arrSimpleUniq(stageIds.map(x => mustBeDefined(stageId2region.get(x))))
				if (regions.length > 0) domain.region = regions[0]
				if (regions.length !== 1)
					throw new Error(`strange regions: [${regions}], using ${domain.region}`)
			})
		})
	}

	applyItemsPostFixes(fixes.postProcess.domains, null, domains)
	sortObject(domains, ([codeA], [codeB]) => codeA.localeCompare(codeB))
	return { code2item: domains }
}

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./common').IdLangMap<DomainLang>} id2domain
 * @param {string} page
 * @param {import('#lib/parsing').DomainTypeCode} type
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @param {Map<string, import('#lib/parsing').ArtifactSetData>} id2artSet
 * @param {Map<string, import('#lib/parsing').EnemyData>} id2enemy
 * @param {import('./fixes').HoneyhunterFixes} fixes
 */
async function parseDomainsGroupPage(
	cacheDir,
	langs,
	id2domain,
	page,
	type,
	id2item,
	id2artSet,
	id2enemy,
	fixes,
) {
	for (const lang of langs) {
		const root = await getHoneyPage(page, cacheDir, lang)
		const table = mustGetJSTableRows(root, /Domains$/, 'main-table')
		table.rows.forEach((cells, rowIndex) => {
			const nameCell = cells[table.mustGetColIndex('Name')]
			const { id, name } = mustGetIdAndName(nameCell, /\/d_(\d+)/, rowIndex)

			const dropCell = cells[table.mustGetColIndex('Reward')]
			const dropItemCodes = []
			const dropArtSetCodes = []
			searchNodeWithTag(dropCell, 'a', node => {
				const href = node.attrs.href ?? ''
				const [type, item] = mustGetItemOrArtSet(href, id2item, id2artSet)
				arrPushIfNew(type === 'item' ? dropItemCodes : dropArtSetCodes, item.code)
				return 'skip-children'
			})
			dropItemCodes.sort()
			dropArtSetCodes.sort()

			let bossCode = /**@type {string|null}*/ (null)
			if (type === 'trounce') {
				const enemiesCell = cells[table.mustGetColIndex('Monsters')]
				searchNodeWithTag(enemiesCell, 'a', node => {
					const id = mustFindNodeHrefMatch(node, /\/m_(\d+)/)[1]
					const enemy = id2enemy.get(id)
					if (!enemy) throw new Error(`unknown enemy #${id}`)
					if (bossCode === null) bossCode = enemy.code
					else warn(`domain '${name}': multiple enemy codes, ignoring`)
					return 'skip-children'
				})
			}

			addLangItem(id2domain, lang, { id, name, type, bossCode, dropItemCodes, dropArtSetCodes })
		})
	}
}

/**
 * @param {string} cacheDir
 * @param {Map<String,import("#lib/genshin").GI_RegionCode>} stageId2region
 * @param {string} page
 * @param {import("#lib/genshin").GI_RegionCode} region
 */
async function parseDomainsRegionPage(cacheDir, stageId2region, page, region) {
	const root = await getHoneyPage(page, cacheDir, 'en')
	const table = mustGetJSTableRows(root, /Stages$/, 'main-table')
	table.rows.map((cells, rowIndex) => {
		const nameCell = cells[table.mustGetColIndex('Name')]
		const { id } = mustGetIdAndName(nameCell, /\/dl_(\d+)/, rowIndex)
		stageId2region.set(id, region)
	})
}
