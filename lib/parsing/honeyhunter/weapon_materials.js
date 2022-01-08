import { getItemCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { warn } from '#lib/utils/logs.js'
import { mustBeDefined } from '#lib/utils/values.js'
import { getTextContent, isNode, mustBeNode, nodeHasClass, searchNode } from '#lib/xml.js'
import { addLangItem, checkedRarity, ensureSame, getHoneyPage, makeLangMap, mustGetImgUrl } from './common.js'

/** @param {import('#lib/xml').NodeOrText} node */
function extractId(node) {
	if (!isNode(node)) return null
	const m = (node.attrs.href ?? '').match(/^\/db\/item\/i_(\d+)/)
	return m ? m[1] : null
}

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

		searchNode(root, (node, ancestors) => {
			if (!isNode(node)) return false

			if (nodeHasClass(node, 'itemname')) {
				const name = getTextContent(node).trim()

				const itemWarn = msg => warn(`item '${name}: `)

				const parent = ancestors[ancestors.length - 1]
				const wrap = ancestors[ancestors.length - 2]
				const parentIndex = wrap.children.indexOf(parent)

				const id = extractId(parent)
				if (id === null) {
					const msg = `expected '.itemname' elem to be wrapped in <a href>, got <${parent.tag} href="${parent.attrs.href}">`
					itemWarn(msg)
					return 'skip-children'
				}

				const foundItemPic = searchNode(
					wrap.children[parentIndex - 1],
					x => isNode(x) && x.tag === 'img' && nodeHasClass(x, 'itempic'),
				)
				if (!foundItemPic) {
					itemWarn(`can not find 'img.itempic' for weapon ascension item #${id}`)
					return 'skip-children'
				}
				const img = mustGetImgUrl(mustBeNode(foundItemPic.node), `item '${name}`)

				const foundStars = searchNode(
					wrap.children[parentIndex - 1],
					x => isNode(x) && nodeHasClass(x, 'itemstarcont'),
				)
				if (!foundStars) {
					itemWarn(`can not find '.itemstarcont' for weapon ascension item #${id}`)
					return 'skip-children'
				}
				let rarity = 0
				searchNode(foundStars.node, x => {
					if (isNode(x) && nodeHasClass(x, 'item_stars')) rarity++
					return false
				})

				let craftedFromId = /**@type {string|null}*/ (null)
				const nextInWrap = wrap.children.at(parentIndex + 1)
				if (nextInWrap && isNode(nextInWrap) && nodeHasClass(nextInWrap, 'sea_item_used_by_char')) {
					searchNode(nextInWrap, x => {
						if (isNode(x) && x.tag === 'a') {
							craftedFromId = extractId(x)
							if (craftedFromId) return true
						}
						return false
					})
				}

				addLangItem(id2langItem, lang, {
					id,
					name,
					rarity: checkedRarity(rarity),
					img,
					craftedFromId,
				})
				return 'skip-children'
			}
			return false
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
