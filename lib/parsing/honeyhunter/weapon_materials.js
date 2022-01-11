import { getItemCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { tryWithContext } from '#lib/utils/logs.js'
import { mustBeDefined } from '#lib/utils/values.js'
import {
	findNodeByClass,
	getTextContent,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	nodeHasClass,
	searchNodeNodes,
} from '#lib/xml.js'
import {
	addLangItem,
	ensureSame,
	getHoneyPage,
	makeLangMap,
	mustCountRarityStars,
	mustGetImgUrl,
} from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{
 *   items: import('#lib/parsing').Code2WeaponMaterialData,
 *   id2item: Map<string, import('#lib/parsing').WeaponMaterialData>,
 *   imgs: import('./common').Code2ImageUrl
 * }>}
 */
export async function extractWeaponMaterialsData(cacheDir, langs, fixes) {
	/**
	 * @typedef {{
	 *   id: string,
	 *   name: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode,
	 *   img: string,
	 *   craftedFromId: string|null
	 * }} ItemLang
	 */
	const id2langItem = /**@type {import('./common').IdLangMap<ItemLang>} */ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('item/weapon-ascension-material-primary', cacheDir, lang)

		searchNodeNodes(root, (node, ancestors) => {
			if (!nodeHasClass(node, 'itemcont')) return false

			tryWithContext(`weapon material`, 'skipping', null, setLogPrefix => {
				const name = getTextContent(mustFindNodeByClass(node, 'itemname')).trim()
				setLogPrefix(`weapon material '${name}'`)

				const id = mustFindNodeHrefMatch(node, /^\/db\/item\/i_(\d+)/)[1]

				const itemPic = mustFindNodeByClass(node, 'itempic')
				const img = mustGetImgUrl(itemPic)

				const rarity = mustCountRarityStars(node, 'itemstarcont', 'item_stars', false)

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

				addLangItem(id2langItem, lang, { id, name, rarity, img, craftedFromId })
			})
			return 'skip-children'
		})
	}

	const id2code = Object.fromEntries(
		Array.from(id2langItem.entries()).map(([id, x]) => [id, getItemCodeFromName(x.en.name)]),
	)

	const baseId2group = /**@type {Record<string, string[]>}*/ ({})
	for (const [id, item] of id2langItem.entries()) {
		let baseId = id
		let baseItem = item
		while (baseItem.en.craftedFromId !== null) {
			baseId = baseItem.en.craftedFromId
			baseItem = mustBeDefined(id2langItem.get(baseId))
		}
		baseId2group[baseId] ??= []
		baseId2group[baseId].push(id)
	}
	const id2groupCode = /**@type {Record<string, string>}*/ ({})
	for (const ids of Object.values(baseId2group)) {
		const codes = ids.map(id => id2code[id]).sort()
		const wordCounts = new Map()
		for (const code of codes)
			for (const word of code.split('-')) {
				const c = wordCounts.get(word)
				wordCounts.set(word, (c === undefined ? 0 : c) + 1)
			}
		let groupCode = codes[0]
			.split('-')
			.filter(x => wordCounts.get(x) === codes.length)
			.join('-')
		groupCode = groupCode.replace(/^of-/, '').replace(/^the-/, '')
		groupCode = groupCode.replace(/-the$/, '').replace(/-of$/, '')
		for (const id of ids) id2groupCode[id] = groupCode
	}

	const materials = /**@type {import('#lib/parsing').Code2WeaponMaterialData}*/ ({})
	const id2item = new Map()
	const imgs = new Map()

	id2langItem.forEach((material, id) => {
		const code = getItemCodeFromName(material.en.name)
		const craftedFromId = ensureSame(material, 'craftedFromId')
		materials[code] = {
			code,
			name: makeLangMap(material, 'name'),
			rarity: ensureSame(material, 'rarity'),
			craftedFromCode: craftedFromId === null ? null : id2code[craftedFromId],
			craftGroupCode: id2groupCode[id],
			isPrimary: true,
		}
		id2item.set(id, materials[code])
		imgs.set(code, ensureSame(material, 'img'))
	})
	sortObject(materials, ([, a], [, b]) => {
		return a.craftGroupCode.localeCompare(b.craftGroupCode) || a.rarity - b.rarity
	})
	return { items: materials, id2item, imgs }
}
