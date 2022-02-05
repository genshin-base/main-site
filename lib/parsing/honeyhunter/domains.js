import { getDomainCodeFromName, GI_ROTATION_WEEKDAY_CODES } from '#lib/genshin.js'
import { arrPushIfNew, mappedArrPush, objGetOrSet, sortObject } from '#lib/utils/collections.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import {
	getTextContent,
	nodeHasClass,
	searchNodeNodes,
	mustFindNodeHrefMatch,
	mustFindNodeByClass,
	isNode,
	searchNodeWithClass,
} from '#lib/xml.js'
import {
	getHoneyPage,
	addLangItem,
	ensureSame,
	makeLangMap,
	mapTableRows,
	mustFindCellIndex,
	mustGetItemOrArtSet,
	findTable,
} from './common.js'

const LOCATION_OFFSET = { x: -751, y: 2336 }
const ROTATION_CODES_MAP = /**@type {Record<string, import('#lib/genshin').WeekdayCode>}*/ ({
	monday: 'mon',
	tuesday: 'tue',
	wednesday: 'wed',
	thursday: 'thu',
	friday: 'fri',
	saturday: 'sat',
	sunday: 'sun',
})

/** @typedef {{weekday:import('#lib/genshin').WeekdayCode, drop:{itemCodes:string[]}}} DomainRawRotation */

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
	/** @typedef {{id:string, name:string, type:import('#lib/parsing').DomainTypeCode}} DomainLang */

	const id2domain = /**@type {import('./common').IdLangMap<DomainLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('domains', cacheDir, lang)

		let type = /**@type {import('#lib/parsing').DomainTypeCode|null}*/ (null)
		searchNodeNodes(root, (node, ancestors) => {
			if (nodeHasClass(node, 'enemy_type')) {
				const text = getTextContent(node).trim()
				if (/^artifacts$/i.test(text)) type = 'artifacts'
				else if (/^weapon ascension materials$/i.test(text)) type = 'weapons'
				else if (/^talent level-up material$/i.test(text)) type = 'talents'
				else if (/^trounce domains$/i.test(text)) type = 'trounce'
				else type = null
				return 'skip-children'
			}

			if (type !== null && nodeHasClass(node, 'char_sea_cont')) {
				tryWithContext(`${type}-domain`, 'skipping', null, setLogPrefix => {
					const id = mustFindNodeHrefMatch(node, /^\/db\/dom\/dun_(\d+)/)[1]
					setLogPrefix(`${type}-domain #${id}`)
					const name = getTextContent(mustFindNodeByClass(node, 'sea_charname')).trim()

					// const dropItemCodes = []
					// const dropArtifactSetCodes = []
					// const itemsWrap = mustFindNodeByClass(node, 'sea_char_mat_cont')
					// for (const itemElem of itemsWrap.children) {
					// 	if (!isNode(itemElem) || itemElem.tag !== 'a') continue
					// 	const href = itemElem.attrs.href ?? ''
					// 	let m
					// 	if ((m = href.match(/\/db\/item\/i_(\d+)/)) !== null) {
					// 		const item = id2item.get(m[1])
					// 		if (item) dropItemCodes.push(item.code)
					// 		else warn(`domain '${name}': unknown item #${m[1]}`)
					// 	} else if ((m = href.match(/\/db\/art\/family\/a_(\d+)/)) !== null) {
					// 		const artSet = id2artSet.get(m[1])
					// 		if (artSet) dropArtifactSetCodes.push(artSet.code)
					// 		else warn(`domain '${name}': unknown artifact set #${m[1]}`)
					// 	} else {
					// 		warn(`domain '${name}': unexteped item href="${href}"`)
					// 	}
					// }

					addLangItem(id2domain, lang, { id, name, type })
				})
				return 'skip-children'
			}
			return false
		})
		progress()
	}

	const id2code = {}
	const domains = /**@type {import('#lib/parsing').Code2DomainData}*/ ({})
	id2domain.forEach((domain, id) => {
		const code = getDomainCodeFromName(domain.en.name)
		domains[code] = {
			code,
			type: ensureSame(domain, 'type'),
			name: makeLangMap(domain, 'name'),
			drop: { itemCodes: [], artifactSetCodes: [] },
			dropTimetable: {},
			region: 'mondstadt',
			location: { mapCode: 'teyvat', x: 0, y: 0 },
			bossCode: null,
		}
		id2code[code] = ensureSame(domain, 'id')
	})
	sortObject(domains, ([, a], [, b]) => a.type.localeCompare(b.type) || a.code.localeCompare(b.code))

	for (const domain of Object.values(domains)) {
		const root = await getHoneyPage(`dom/dun_${id2code[domain.code]}`, cacheDir, 'en')

		// ищем расположение на карте
		searchNodeNodes(root, (node, ancestors) => {
			if (node.tag !== 'iframe') return false
			const m = (node.attrs.src ?? '').match(/pin=(-?\d+(?:\.\d+)?)\|(-?\d+(?:\.\d+)?)/)
			if (!m) return false
			domain.location = {
				mapCode: 'teyvat',
				x: -(Math.round(parseFloat(m[2])) - LOCATION_OFFSET.x),
				y: -Math.round(parseFloat(m[1]) - LOCATION_OFFSET.y),
			}
			return true
		})
		if (domain.location.x === 0 && domain.location.y === 0) {
			const fix = fixes.domainMissingLocations.find(x => x.code === domain.code)
			if (fix) {
				domain.location = fix.location
				fix._used = true
			} else {
				warn(`domain '${domain.code}': location not found, using {${Object.values(domain.location)}}`)
			}
		}

		// ищем список дропа
		mapTableRows(
			root,
			/^Drops Summary$/i,
			headerCells => ({ item: mustFindCellIndex(headerCells, /^item$/i) }),
			(cells, colIndex, rowIndex) =>
				tryWithContext(`domain '${domain.code}' drop row #${rowIndex + 1}`, 'skipping', null, () => {
					const href = mustFindNodeHrefMatch(cells[colIndex.item], /^\/db\/.*/)[0]

					const [type, item] = mustGetItemOrArtSet(href, id2item, id2artSet)
					if (type === 'item') domain.drop.itemCodes.push(item.code)
					else domain.drop.artifactSetCodes.push(item.code)

					return null
				}),
		)
		domain.drop.itemCodes.sort()
		domain.drop.artifactSetCodes.sort()

		// ищем врагов (не-боссы пока не нужны, к тому же они отличаются в зависимости от уровня данжа)
		if (domain.type === 'trounce') {
			tryWithContext(`enemies in '${domain.code}'`, 'skipping', null, () => {
				const enemyIds = new Set()

				searchNodeNodes(root, (node, ancestors) => {
					if (node.tag === 'tr' && node.children.length >= 2) {
						if (ancestors.some(x => nodeHasClass(x, 'add_stat_table'))) {
							if (/^monsters$/i.test(getTextContent(node.children[0]).trim())) {
								const cell = node.children[1]
								const id = mustFindNodeHrefMatch(cell, /^\/db\/monster\/m_(\d+)/)[1]
								enemyIds.add(id)
							}
						}
						return 'skip-children'
					}
					return false
				})

				if (enemyIds.size === 0) throw new Error(`found no enemies`)
				if (enemyIds.size > 1)
					throw new Error(`found multiple enemies (${Array.from(enemyIds.entries())})`)

				const id = enemyIds.values().next().value
				const enemy = id2enemy.get(id)
				if (!enemy) throw new Error(`unknown enemy #${id}`)
				domain.bossCode = enemy.code
			})
		}

		// ищем расписание
		const [, rotationTBodyNode] = findTable(root, /^Dungeon Rotation$/i)
		if (rotationTBodyNode) {
			// ищем заголовки с раскрывающимися группами ссылок на таблицы с инфой (в том числе дропами)
			const hash2weekdays = /**@type {Map<string, import('#lib/genshin').WeekdayCode[]>}*/ (new Map())
			let curGroupCode = /**@type {string|null}*/ (null)
			searchNodeNodes(rotationTBodyNode, (node, ancestors) => {
				if (nodeHasClass(node, 'widget_menu_item')) {
					const hashes = []
					searchNodeNodes(node, node => {
						if (node.tag === 'a') hashes.push(node.attrs.href ?? '')
						return false
					})

					if (hashes.length === 0) {
						curGroupCode = getTextContent(node).trim().toLocaleLowerCase()
					} else if (curGroupCode !== null) {
						const weekday = ROTATION_CODES_MAP[curGroupCode]
						if (weekday)
							for (const hash of hashes) {
								mappedArrPush(hash2weekdays, hash, weekday)
							}
					}
				}
				return false
			})

			// ищем таблицы с подробностями (заголовки типа "Memories: Earthshaking Dragon IV")
			searchNodeNodes(root, (node, ancestors) => {
				if (node.tag !== 'td' || !('id' in node.attrs)) return false
				const subRotationHash = '#' + node.attrs.id
				const weekdays = hash2weekdays.get(subRotationHash)
				if (!weekdays) return false

				// ищем ячейку с дропом
				const titleRow = ancestors[ancestors.length - 1] //Memories: Earthshaking Dragon IV
				const tbody = ancestors[ancestors.length - 2]
				const trIndex = tbody.children.indexOf(titleRow)
				let rewardsCell = null
				for (let i = trIndex; i < tbody.children.length; i++) {
					const tr = tbody.children[i]
					if (!isNode(tr)) continue
					if ('id' in tr.attrs) break //дошли до следующего заголовка
					if (tr.children.length >= 2) {
						if (getTextContent(tr.children[0]).trim().toLocaleLowerCase() === 'rewards') {
							rewardsCell = tr.children[1]
							break
						}
					}
				}

				// вытаскиваем дроп
				if (rewardsCell) {
					searchNodeWithClass(rewardsCell, 'nowrap_rew_cont', node => {
						const href = mustFindNodeHrefMatch(node, /^\/db\/.*/)[0]

						const [type, item] = mustGetItemOrArtSet(href, id2item, id2artSet)
						for (const weekday of weekdays) {
							const drop = objGetOrSet(domain.dropTimetable, weekday, () => ({ itemCodes: [] }))
							if (type === 'item') arrPushIfNew(drop.itemCodes, item.code)
							// артефакты тут пока не нужны
							// else drop.artifactSetCodes.push(item.code)
						}
						return 'skip-children'
					})
				} else {
					const msg = `domain '${domain.code}': ${weekdays} rotation ${subRotationHash}: can not find rewards`
					warn(msg)
				}

				return 'skip-children'
			})

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
	}
	return { code2item: domains }
}
