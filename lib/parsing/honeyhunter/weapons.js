import { getWeaponCodeFromName, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { warn } from '#lib/utils/logs.js'
import { isNode, searchNode } from '#lib/xml.js'
import {
	addLangItems,
	checkedRarity,
	DUMMY_NODE,
	ensureSame,
	getHoneyPage,
	makeLangMap,
	mapTableRows,
	mustFindCellIndex,
	mustGetIdAndName,
	mustGetImgUrl,
} from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @param {Map<string, import('#lib/parsing').WeaponMaterialData>|null} id2material
 * @returns {Promise<{items:import('#lib/parsing').Code2WeaponData, imgs:import('./common').Code2ImageUrl}>}
 */
export async function extractWeaponsData(cacheDir, langs, id2material, fixes) {
	/**
	 * @typedef {{
	 *   id: string,
	 *   type: string,
	 *   name: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode,
	 *   primaryMaterialGroupCode: string,
	 *   img: string,
	 * }} WeaponLang
	 */
	const id2weapon = /**@type {import('./common').IdLangMap<WeaponLang>} */ (new Map())
	const id2upcoming = /**@type {import('./common').IdLangMap<WeaponLang>} */ (new Map())

	for (const lang of langs) {
		/**
		 * @param {import('#lib/xml').Node} root
		 * @param {string} type
		 * @param {RegExp} titleRe
		 */
		function getNames(root, type, titleRe) {
			return mapTableRows(
				root,
				titleRe,
				header => ({
					icon: mustFindCellIndex(header.children, /^icon$/i),
					name: mustFindCellIndex(header.children, /^name$/i),
					rarity: mustFindCellIndex(header.children, /^rarity$/i),
					material: mustFindCellIndex(header.children, /^material$/i),
				}),
				(cells, colIndex, rowIndex) => {
					const nameCell = cells[colIndex.name]
					if (nameCell === DUMMY_NODE) return null
					const { id, name } = mustGetIdAndName(nameCell, /\/w_(\d+)/, rowIndex)

					let starCount = 0
					searchNode(cells[colIndex.rarity], node => {
						if (!isNode(node)) return false
						if (!node.attrs.class?.includes('stars_wrap')) return false
						starCount++
						return 'skip-children'
					})

					let primaryMaterialGroupCode = '<dummy>'
					if (id2material !== null) {
						const materials = /**@type {import('#lib/parsing').WeaponMaterialData[]}*/ ([])
						searchNode(cells[colIndex.material], node => {
							if (!isNode(node) || node.tag !== 'a') return false
							const m = (node.attrs.href ?? '').match(/^\/db\/item\/i_(\d+)/)
							if (!m) return false
							const material = id2material.get(m[1])
							if (material) materials.push(material)
							return 'skip-children'
						})
						const primaryMaterial = materials.find(x => x.isPrimary)
						if (!primaryMaterial) {
							warn(`weapon '${name}': can not find primary material, skipping`)
							return null
						}
						primaryMaterialGroupCode = primaryMaterial.craftGroupCode
					}

					return {
						type,
						id,
						name,
						rarity: checkedRarity(starCount),
						primaryMaterialGroupCode,
						img: mustGetImgUrl(cells[colIndex.icon], `weapons row #${rowIndex + 1}`),
					}
				},
			)
		}
		for (const type of GI_WEAPON_TYPE_CODES) {
			const root = await getHoneyPage('weapon/' + type, cacheDir, lang)
			addLangItems(id2weapon, lang, await getNames(root, type, /^Released .* Weapons$/i))
			addLangItems(id2upcoming, lang, await getNames(root, type, /Upcoming\s+Weapons$/i))
		}
	}
	for (const [id, weapon] of id2upcoming.entries()) {
		const fix = fixes.statuses.weapons.find(x => x.actually === 'released' && x.name === weapon.en.name)
		if (fix) {
			fix._used = true
			id2weapon.set(id, weapon)
		}
	}

	const weapons = /**@type {import('#lib/parsing').Code2WeaponData}*/ ({})
	const imgs = new Map()
	id2weapon.forEach((weapon, id) => {
		const code = getWeaponCodeFromName(weapon.en.name)
		weapons[code] = {
			code,
			typeCode: ensureSame(weapon, 'type'),
			name: makeLangMap(weapon, 'name'),
			rarity: ensureSame(weapon, 'rarity'),
			primaryMaterialGroupCode: ensureSame(weapon, 'primaryMaterialGroupCode'),
		}
		imgs.set(code, ensureSame(weapon, 'img'))
	})
	sortObject(weapons, ([codeA], [codeB]) => codeA.localeCompare(codeB))
	return { items: weapons, imgs }
}
