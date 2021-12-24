import { getWeaponCodeFromName, GI_WEAPON_TYPE_CODES } from '#lib/genshin'
import { isNode, searchNode } from '#lib/xml'
import {
	addLangItems,
	checkedRarity,
	DUMMY_NODE,
	ensureSame,
	forEachSortedLangItem,
	getHoneyPage,
	makeLangMap,
	mapTableRows,
	mustFindCellIndex,
	mustGetIdAndName,
	mustGetImgUrl,
} from './common'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{items:import('#lib/parsing').WeaponsInfo, imgs:import('./common').Code2ImageUrl}>}
 */
export async function extractWeaponsData(cacheDir, langs, fixes) {
	/**
	 * @typedef {{
	 *   id: string,
	 *   type: string,
	 *   name: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode,
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
				}),
				(cells, colIndex, rowIndex) => {
					const nameCell = cells[colIndex.name]
					if (nameCell === DUMMY_NODE) return null
					let starCount = 0
					searchNode(cells[colIndex.rarity], node => {
						if (isNode(node) && (node.attrs.class ?? '').includes('stars_wrap')) {
							starCount++
							return 'skip-children'
						}
						return false
					})
					return {
						type,
						...mustGetIdAndName(nameCell, /\/w_(\d+)/, rowIndex),
						rarity: checkedRarity(starCount),
						img: mustGetImgUrl(cells[colIndex.icon], rowIndex),
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

	const weapons = /**@type {import('#lib/parsing').WeaponsInfo}*/ ({})
	const imgs = new Map()
	forEachSortedLangItem(id2weapon, getWeaponCodeFromName, (code, weapon) => {
		weapons[code] = {
			code,
			typeCode: ensureSame(weapon, 'type'),
			name: makeLangMap(weapon, 'name'),
			rarity: ensureSame(weapon, 'rarity'),
		}
		imgs.set(code, ensureSame(weapon, 'img'))
	})
	return { items: weapons, imgs }
}
