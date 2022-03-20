import { getWeaponCodeFromName, getWithMaxRarity, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { tryWithContext } from '#lib/utils/logs.js'
import { mustBeDefined } from '#lib/utils/values.js'
import { DUMMY_NODE, getTextContent, mustFindCellIndex, searchNodeWithTag } from '#lib/xml.js'
import { statTextToCodeChecked } from '../stats.js'
import {
	addLangItems,
	checkedWeaponTypeCode,
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
	 *   specialAbility: string,
	 *   img: string,
	 * }} WeaponLang
	 */
	const id2langWeapon = /**@type {import('./common').IdLangMap<WeaponLang>} */ (new Map())
	const id2langUpcoming = /**@type {import('./common').IdLangMap<WeaponLang>} */ (new Map())

	const itemCode2craftGroup = groupItemsByCraft(Array.from(id2item.values()))
	function withMaxRarityInGroup(item) {
		return getWithMaxRarity(mustBeDefined(itemCode2craftGroup.get(item.code)))
	}

	for (const lang of langs) {
		/**
		 * @param {import('#lib/xml').Node} root
		 * @param {string} type
		 * @param {RegExp} titleRe
		 * @returns {WeaponLang[]}
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
					ability: mustFindCellIndex(headerCells, /^special ability$/i),
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

						let specialAbility = getTextContent(cells[colIndex.ability]).trim()
						specialAbility = fixes.descriptionLangFix(specialAbility, lang)

						const img = mustGetImgUrl(cells[colIndex.icon], `weapons row #${rowIndex + 1}`)
						return { type, id, name, rarity, materialCodes, specialAbility, img }
					}),
			)
		}
		for (const type of GI_WEAPON_TYPE_CODES) {
			const root = await getHoneyPage('weapon/' + type, cacheDir, lang)
			addLangItems(id2langWeapon, lang, await getNames(root, type, /^Released .* Weapons$/i))
			addLangItems(id2langUpcoming, lang, await getNames(root, type, /Upcoming\s+Weapons$/i))
		}
	}
	for (const [id, weapon] of id2langUpcoming.entries()) {
		const fix = fixes.statuses.weapons.find(x => x.actually === 'released' && x.name === weapon.en.name)
		if (fix) {
			fix._used = true
			id2langWeapon.set(id, weapon)
		}
	}

	const code2weapon = /**@type {import('#lib/parsing').Code2WeaponData}*/ ({})
	const id2weapon = /**@type {Map<string, import('#lib/parsing').WeaponData>}*/ (new Map())
	const code2img = new Map()
	for (const [id, langWeapon] of id2langWeapon) {
		const code = getWeaponCodeFromName(langWeapon.en.name)
		const weapon = {
			code,
			typeCode: checkedWeaponTypeCode(ensureSame(langWeapon, 'type'), `weapon '${code}'`),
			name: makeLangMap(langWeapon, 'name'),
			rarity: ensureSame(langWeapon, 'rarity'),
			atk: { base: 0, max: 0 },
			subStat: null,
			specialAbility: makeLangMap(langWeapon, 'specialAbility'),
			materialCodes: ensureSame(langWeapon, 'materialCodes'),
			obtainSources: [],
		}
		code2weapon[code] = weapon
		id2weapon.set(id, weapon)
		code2img.set(code, ensureSame(langWeapon, 'img'))
	}
	sortObject(code2weapon, ([codeA], [codeB]) => codeA.localeCompare(codeB))

	// статы на уровнях
	for (const [id, weapon] of id2weapon) {
		const root = await getHoneyPage('weapon/w_' + id, cacheDir, 'en')
		mapTableRows(
			root,
			/^stat progression$/i,
			headerCells => {
				const baseAtkIndex = mustFindCellIndex(headerCells, /^base atk$/i)
				return {
					levelIndex: mustFindCellIndex(headerCells, /^level$/i),
					baseAtkIndex,
					subStat: getTextContent(headerCells[baseAtkIndex + 1]).trim(),
				}
			},
			(cells, header, rowIndex) => {
				tryWithContext(`weapon '${weapon.code}' stats`, 'using default', null, () => {
					const lvl = mustParseInt(cells[header.levelIndex])
					const atk = mustParseInt(cells[header.baseAtkIndex])
					const sub = mustParseInt(cells[header.baseAtkIndex + 1])
					if (lvl === 1) {
						weapon.atk.base = sub
						if (header.subStat !== 'none') {
							const code = statTextToCodeChecked(header.subStat, `of weapon '${weapon.code}'`)
							weapon.subStat = { code, base: sub, max: sub }
						}
					}
					weapon.atk.max = atk
					if (weapon.subStat) weapon.subStat.max = sub
				})
			},
		)
	}
	return { code2item: code2weapon, code2img }
}

/** @param {import('#lib/xml').Node} node */
function mustParseInt(node) {
	const text = getTextContent(node)
	const val = parseInt(text)
	if (isNaN(val)) throw new Error(`wrong int '${text}'`)
	return val
}
