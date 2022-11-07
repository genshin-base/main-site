import { getItemCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { tryWithContext, warn } from '#lib/utils/logs.js'
import { mustBeDefined, simpleDeepEqual } from '#lib/utils/values.js'
import {
	getTextContent,
	isNode,
	mustFindNodeHrefMatch,
	mustFindNodeWithTag,
	searchNodeWithClass,
} from '#lib/xml.js'
import {
	getHoneyPage,
	mustGetImgUrl,
	mustCountRarityStars,
	addLangItems,
	makeLangMap,
	ensureSame,
	mustGetJSTableRows,
} from './common.js'
import { applyItemsPostFixes, shouldSkipByFix } from './fixes.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{
 *   code2item: import('#lib/parsing/index').Code2ItemData,
 *   id2item: Map<string, import('#lib/parsing/index').ItemData>,
 *   code2img: import('./common').Code2ImageUrl,
 * }>}
 */
export async function extractItemsData(cacheDir, langs, fixes) {
	const id2rawItem = /**@type {Map<string, ItemRawLangData>}*/ (new Map())
	const add = (page, /**@type {import('#lib/parsing').ItemType}*/ type) =>
		parseItemsTablePage(page, cacheDir, langs, type, id2rawItem, fixes)
	await add('fam_currency', 'currency')
	await add('fam_ingredient', 'ingredient')
	await add('fam_alchemy_ingredient', 'ingredient')
	await add('fam_forging_ingredient', 'ingredient')
	await add('fam_char_jewel', 'character-material-jewel')
	await add('fam_char_stone', 'character-material-elemental-stone')
	await add('fam_char_common', 'character-material-secondary')
	await add('fam_char_local', 'character-material-local')
	await add('fam_talent', 'character-material-talent')
	await add('fam_wep_primary', 'weapon-material-primary')
	await add('fam_wep_secondary', 'weapon-material-secondary')
	await add('mcat_28040101', 'fish')

	const code2item = /**@type {import('#lib/parsing/index').Code2ItemData} */ ({})
	const id2item = /**@type {Map<string, import('#lib/parsing/index').ItemData>}*/ (new Map())
	const code2img = /**@type {import('./common').Code2ImageUrl}*/ (new Map())
	id2rawItem.forEach((raw, id) => {
		if (raw.code in code2item && mustBeDefined(id2rawItem.get(id)).code !== raw.code) {
			const ids = [...id2rawItem.values()].filter(x => x.code === raw.code).map(x => x.id)
			warn(`items code '${raw.code}' #${id} collision, ids: ${ids}`)
		}

		const craftedFrom = []
		for (const ref of raw.craftedFrom) {
			const src = id2rawItem.get(ref.id)
			if (src) craftedFrom.push({ code: src.code, count: ref.count })
			else warn(`can not find item #${ref.id} (used to craft '${raw.code}' from [${raw.types}])`)
		}

		const item = {
			code: raw.code,
			name: raw.name,
			types: raw.types.sort(),
			rarity: raw.rarity,
			craftedFrom,
			locations: [],
		}

		code2item[raw.code] = item
		id2item.set(id, item)
		code2img.set(raw.code, raw.imgUrl)
	})
	applyItemsPostFixes(fixes.postProcess.items, id2item, code2item, code2img)
	sortObject(code2item, ([, a], [, b]) => {
		return a.types[0].localeCompare(b.types[0]) || a.code.localeCompare(b.code)
	})
	return { code2item, id2item, code2img }
}

/**
 *
 * @param {import('#lib/parsing/index').Code2ItemData} code2item
 * @param {import('#lib/parsing/index').Code2WeaponData} code2weapon
 */
export function applyItemTypesByWeapons(code2item, code2weapon) {
	for (const weapon of Object.values(code2weapon)) {
		for (const code of weapon.materialCodes) {
			const item = code2item[code]
			if (!item) continue
			if (
				!item.types.includes('weapon-material-primary') &&
				!item.types.includes('weapon-material-secondary')
			) {
				item.types.push('weapon-material-secondary')
				item.types.sort()
			}
		}
	}
}

/**
 * @param {import('#lib/parsing').ItemData} item
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @returns {import('#lib/parsing').ItemData|null}
 */
function find3CraftParent(item, code2item) {
	if (item.craftedFrom.length === 1 && item.craftedFrom[0].count === 3) {
		return code2item[item.craftedFrom[0].code] ?? null
	}
	return null
}

/**
 * Коды исходных элементов для трёхпредметного крафта.
 * @param {import('#lib/parsing').ItemData|null|undefined} item
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @returns {string[]}
 */
export function getItemAncestryCodes(item, code2item) {
	const ancestryCodes = []
	while (item) {
		item = find3CraftParent(item, code2item)
		if (item) ancestryCodes.push(item.code)
	}
	return ancestryCodes
}

/**
 * Возвращается мапу код_предмета:массив_связанных_предметов.
 * Предмет <код_предмета> входит в массив.
 * Группирует только по трёхпредметному крафту (готовка, изменения элементов Азотом и т.д. не учитываются)
 * @param {import('#lib/parsing').ItemData[]} items
 * @returns {Map<string, import('#lib/parsing').ItemData[]>}
 */
export function groupItemsByCraft(items) {
	const code2item = /**@type {Record<string, import('#lib/parsing').ItemData>}*/ ({})
	for (const item of items) code2item[item.code] = item

	const code2group = /**@type {Map<string, import('#lib/parsing').ItemData[]>}*/ (new Map())
	for (const item of items) {
		if (code2group.has(item.code)) continue

		let curItem = item
		let groupItems = [curItem]
		while (true) {
			// searching craft parent
			const newItem = find3CraftParent(curItem, code2item)
			if (!newItem) break

			const existingGroup = code2group.get(newItem.code)
			if (existingGroup) {
				if (existingGroup !== groupItems) {
					// found existing group: copying new elements there and using it instead of current
					for (const gi of groupItems) existingGroup.push(gi)
					groupItems = existingGroup
					// each group is filled until the base item; no need iterating to the base second time
					break
				}
			} else {
				groupItems.push(newItem)
			}

			curItem = newItem
		}
		for (const gi of groupItems) code2group.set(gi.code, groupItems)
	}

	return code2group
}

/**
 * @typedef {{
 *   id: string,
 *   types: import('#lib/parsing').ItemType[],
 *   code: string,
 *   name: Record<string, string>,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   imgUrl: string,
 *   craftedFrom: {id:string, count:number}[]
 * }} ItemRawLangData
 */

/**
 * @typedef {{
 *   id: string,
 *   name: string,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 *   imgUrl: string,
 *   craftedFrom: {id:string, count:number}[]
 * }} TableItemRawData
 */

/**
 * @param {string} pagePath
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('#lib/parsing').ItemType} type
 * @param {Map<string, ItemRawLangData>} id2item
 * @param {import('./fixes').HoneyhunterFixes} fixes
 */
async function parseItemsTablePage(pagePath, cacheDir, langs, type, id2item, fixes) {
	const langItems = /**@type {import('./common').IdLangMap<TableItemRawData>}*/ (new Map())
	for (const lang of langs) {
		const root = await getHoneyPage(pagePath, cacheDir, lang)
		const items = parseItemsTable(root, pagePath)
		addLangItems(langItems, lang, items)
	}

	langItems.forEach((langItem, id) => {
		if (shouldSkipByFix(fixes.skip.items, langItem.en.name)) return

		const item = {
			id,
			types: [type],
			code: getItemCodeFromName(langItem.en.name),
			name: makeLangMap(langItem, 'name'),
			rarity: ensureSame(langItem, 'rarity'),
			imgUrl: ensureSame(langItem, 'imgUrl'),
			craftedFrom: ensureSame(langItem, 'craftedFrom'),
		}

		const questions = '？？？'
		const naName = Object.entries(item.name).find(([lang, name]) => name === 'n/a' || name === questions)
		if (naName) {
			const [lang, name] = naName
			if (name !== questions)
				warn(`honyhunter item '${item.code}': ${lang} name is unavailable (${name}), skipping item`)
			return
		}

		const existing = id2item.get(id)
		if (existing) {
			if (existing.code !== item.code)
				warn(
					`already has item #${id} '${existing.code}' (${existing.types}), ` +
						`owerwriting with '${item.code}' (${type})`,
				)
			if (!simpleDeepEqual(existing.craftedFrom, item.craftedFrom))
				warn(`different craft recepies for '${item.code}' (${existing.types} and ${type})`)
			if (existing.types[0] !== 'ingredient') item.types.push(...existing.types)
			item.types.sort()
		}

		id2item.set(id, item)
	})
}

/**
 * @param {import('#lib/xml').Node} root
 * @param {string} logPrefix
 */
function parseItemsTable(root, logPrefix) {
	const items = /**@type {TableItemRawData[]}*/ ([])

	tryWithContext(logPrefix, 'skipping', null, setLogPrefix => {
		const table = mustGetJSTableRows(root, /./, 'main-table')

		for (const cells of table.rows) {
			tryWithContext(logPrefix, 'skipping', null, setLogPrefix => {
				const nameCell = cells[table.mustGetColIndex('Name')]
				const name = getTextContent(nameCell).trim()

				setLogPrefix(`${logPrefix} '${name}'`)

				const [, , id] = mustFindNodeHrefMatch(nameCell, /^\/(i|m)_(n?\d+)/)

				const imgUrl = mustGetImgUrl(cells[table.mustGetColIndex('Icon')])

				const rarityCellIndex = table.colTitle2index.get('Rarity')
				const rarity =
					rarityCellIndex === undefined
						? 3
						: mustCountRarityStars(cells[rarityCellIndex], null, 'cur_icon', false)

				const craftedFrom = /**@type {TableItemRawData["craftedFrom"]}*/ ([])
				const recipeCellIndex = table.colTitle2index.get('Recipe')
				if (recipeCellIndex !== undefined) {
					searchNodeWithClass(cells[recipeCellIndex], 'nowrap_cont', node => {
						const curCraftedFrom = /**@type {typeof craftedFrom}*/ ([])
						const moraId = '2001' //TODO
						const dustOfAzothId = '674' //TODO
						const dreamSolventId = '209' //TODO
						for (const child of node.children) {
							if (!isNode(child) || child.tag !== 'a') continue

							const [, , id] = mustFindNodeHrefMatch(child, /^\/(i)_(n?\d+)/)

							const countStr = getTextContent(mustFindNodeWithTag(child, 'span'))
							const count = parseInt(countStr)
							if (isNaN(count)) throw new Error(`wrong item #${id} count '${countStr}'`)

							if (id !== moraId) curCraftedFrom.push({ id, count })
						}
						if (!curCraftedFrom.some(x => x.id === dustOfAzothId || x.id === dreamSolventId)) {
							if (craftedFrom.length === 0) craftedFrom.push(...curCraftedFrom)
							else warn(`${logPrefix}: '${name}': multiple craft groups, using first one`)
						}
						return 'skip-children'
					})
				}

				items.push({ id, name, rarity, imgUrl, craftedFrom })
			})
		}
	})
	return items
}
