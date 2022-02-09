import { getItemCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { tryWithContext, warn } from '#lib/utils/logs.js'
import { simpleDeepEqual } from '#lib/utils/values.js'
import {
	findNodeByClass,
	getTextContent,
	isNode,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	searchNodeNodes,
	searchNodeWithClass,
} from '#lib/xml.js'
import {
	getHoneyPage,
	mustGetImgUrl,
	mustCountRarityStars,
	addLangItems,
	makeLangMap,
	ensureSame,
} from './common.js'
import { applyItemsPostFixes } from './fixes.js'

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
		parseItemsTablePage(page, cacheDir, langs, type, id2rawItem)
	await add('item/currency', 'currency')
	await add('item/ingredients', 'ingredient')
	await add('item/character-ascension-material-jewel', 'character-material-jewel')
	await add('item/character-ascension-material-elemental-stone', 'character-material-elemental-stone')
	await add('item/character-ascension-material-secondary-material', 'character-material-secondary')
	await add('item/character-ascension-material-local-material', 'character-material-local')
	await add('item/talent-level-up-material', 'character-material-talent')
	await add('item/weapon-ascension-material-primary', 'weapon-material-primary')
	await add('item/weapon-ascension-material-secondary-material', 'weapon-material-secondary')
	await add('item/fish', 'fish')

	const code2item = /**@type {import('#lib/parsing/index').Code2ItemData} */ ({})
	const id2item = /**@type {Map<string, import('#lib/parsing/index').ItemData>}*/ (new Map())
	const code2img = /**@type {import('./common').Code2ImageUrl}*/ (new Map())
	id2rawItem.forEach((raw, id) => {
		if (raw.code in code2item) warn(`items code '${raw.code}' collision`)

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
	applyItemsPostFixes(fixes.postProcess.items, id2item, code2item)
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
 */
async function parseItemsTablePage(pagePath, cacheDir, langs, type, id2item) {
	const langItems = /**@type {import('./common').IdLangMap<TableItemRawData>}*/ (new Map())
	for (const lang of langs) {
		const root = await getHoneyPage(pagePath, cacheDir, lang)
		const item = parseItemsTable(root, pagePath)
		addLangItems(langItems, lang, item)
	}

	langItems.forEach((langItem, id) => {
		const item = {
			id,
			types: [type],
			code: getItemCodeFromName(langItem.en.name),
			name: makeLangMap(langItem, 'name'),
			rarity: ensureSame(langItem, 'rarity'),
			imgUrl: ensureSame(langItem, 'imgUrl'),
			// characterIds: ensureSame(langItem, 'characterIds'),
			craftedFrom: ensureSame(langItem, 'craftedFrom'),
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
			item.types.push(...existing.types)
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

	searchNodeWithClass(root, 'itemcont', (node, ancestors) => {
		tryWithContext(logPrefix, 'skipping', null, setLogPrefix => {
			const name = getTextContent(mustFindNodeByClass(node, 'itemname')).trim()
			if (/^[？?]+$/.test(name)) return // skipping items like '？？？' (later renamed to '???')

			setLogPrefix(`${logPrefix} '${name}'`)
			const itemWarn = msg => warn(`${logPrefix} '${name}': ${msg}`)

			const [, type, id] = mustFindNodeHrefMatch(node, /^\/db\/item\/(i|h)_(\d+)/)
			if (type === 'h') return //у предмета тип "furniture", такой пока не нужен

			const itemPic = mustFindNodeByClass(node, 'itempic')
			const imgUrl = mustGetImgUrl(itemPic)

			const rarity = mustCountRarityStars(node, 'itemstarcont', 'item_stars', false)

			// const characterIds = /**@type {TableItemRawData["characterIds"]}*/ ([])
			const craftedFrom = /**@type {TableItemRawData["craftedFrom"]}*/ ([])

			searchNodeWithClass(node, 'sea_item_used_by_char', node => {
				let type = /**@type {'character'|'item'|null}*/ (null)
				for (const child of node.children) {
					if (!isNode(child)) continue
					if (child.tag === 'a') {
						const href = child.attrs.href ?? ''
						if (!type || type === 'character') {
							const m = href.match(/^\/db\/char\/(\w+?)\//)
							if (m) {
								type = 'character'
								// characterIds.push(m[1])
								continue
							} else if (type) {
								itemWarn(`can not get character id from subitem <a href="${href}">`)
								continue
							}
						}
						if (!type || type === 'item') {
							const m = href.match(/^\/db\/item\/i_(\d+)/)
							if (m) {
								type = 'item'
								craftedFrom.push({ id: m[1], count: 1 })
								continue
							} else if (type) {
								itemWarn(`can not get item id from subitem <a href="${href}">`)
								continue
							}
						}
						itemWarn(`strange subitem <a href="${href}">`)
					} else {
						const text = getTextContent(child).trim()
						let m
						if (type === 'item' && (m = text.match(/^x\s*(\d+)$/))) {
							craftedFrom[craftedFrom.length - 1].count = parseInt(m[1], 10)
						} else {
							itemWarn(`unexpected text between subitems: '${text}'`)
						}
					}
				}
				return 'skip-children'
			})

			let craftedFromId = /**@type {string|null}*/ (null)
			const resourcesWrap = findNodeByClass(node, 'sea_item_used_by_char')
			if (resourcesWrap)
				searchNodeNodes(resourcesWrap, x => {
					if (x.tag === 'a') {
						const m = (x.attrs.href ?? '').match(/^\/db\/item\/i_(\d+)/)
						if (m) craftedFromId = m[1]
					}
					return craftedFromId !== null
				})

			items.push({ id, name, rarity, imgUrl, craftedFrom })
		})
		return 'skip-children'
	})

	return items
}
