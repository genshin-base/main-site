import { getWeaponCodeFromName, getWithMaxRarity, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { tryWithContext } from '#lib/utils/logs.js'
import { mustBeDefined } from '#lib/utils/values.js'
import { DUMMY_NODE, mustFindCellIndex, searchNodeWithTag } from '#lib/xml.js'
import {
	addLangItems,
	ensureSame,
	getHoneyPage,
	makeLangMap,
	mapTableRows,
	mustCountRarityStars,
	mustGetIdAndName,
	mustGetImgUrl,
	mustGetItem,
} from './common.js'
import { groupItemsByCraft } from './items.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @param {Map<string, import('#lib/parsing').ItemData>} id2item
 * @returns {Promise<{
 *   code2item: import('#lib/parsing').Code2WeaponData,
 *   code2img: import('./common').Code2ImageUrl,
 * }>}
 */
export async function extractWeaponsData(cacheDir, langs, id2item, fixes) {
	/**
	 * @typedef {{
	 *   id: string,
	 *   type: string,
	 *   name: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode,
	 *   materialCodes: string[],
	 *   img: string,
	 * }} WeaponLang
	 */
	const id2weapon = /**@type {import('./common').IdLangMap<WeaponLang>} */ (new Map())
	const id2upcoming = /**@type {import('./common').IdLangMap<WeaponLang>} */ (new Map())

	const itemCode2craftGroup = groupItemsByCraft(Array.from(id2item.values()))
	function withMaxRarityInGroup(item) {
		return getWithMaxRarity(mustBeDefined(itemCode2craftGroup.get(item.code)))
	}

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
				headerCells => ({
					icon: mustFindCellIndex(headerCells, /^icon$/i),
					name: mustFindCellIndex(headerCells, /^name$/i),
					rarity: mustFindCellIndex(headerCells, /^rarity$/i),
					material: mustFindCellIndex(headerCells, /^material$/i),
				}),
				(cells, colIndex, rowIndex) =>
					tryWithContext(`${type}-weapon`, 'skipping', null, setLogPrefix => {
						const nameCell = cells[colIndex.name]
						if (nameCell === DUMMY_NODE) return null
						const { id, name } = mustGetIdAndName(nameCell, /\/w_(\d+)/, rowIndex)

						setLogPrefix(`weapon '${name}'`)

						const rarity = mustCountRarityStars(cells[colIndex.rarity], null, 'stars_wrap', false)

						const materialCodes = []
						searchNodeWithTag(cells[colIndex.material], 'a', node => {
							tryWithContext(`weapon '${name}' material`, 'skipping', null, () => {
								const item = mustGetItem(node.attrs.href ?? '', id2item)
								materialCodes.push(withMaxRarityInGroup(item).code)
							})
							return 'skip-children'
						})

						const img = mustGetImgUrl(cells[colIndex.icon], `weapons row #${rowIndex + 1}`)
						return { type, id, name, rarity, materialCodes, img }
					}),
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
	const code2img = new Map()
	id2weapon.forEach((weapon, id) => {
		const code = getWeaponCodeFromName(weapon.en.name)
		weapons[code] = {
			code,
			typeCode: ensureSame(weapon, 'type'),
			name: makeLangMap(weapon, 'name'),
			rarity: ensureSame(weapon, 'rarity'),
			materialCodes: ensureSame(weapon, 'materialCodes'),
			obtainSources: [],
		}
		code2img.set(code, ensureSame(weapon, 'img'))
	})
	sortObject(weapons, ([codeA], [codeB]) => codeA.localeCompare(codeB))
	return { code2item: weapons, code2img }
}
