import { getWeaponCodeFromName, getWithMaxRarity, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { progress, tryWithContext } from '#lib/utils/logs.js'
import { mustBeDefined } from '#lib/utils/values.js'
import {
	forEachTBodyRow,
	getMultilineTextContent,
	getTextContent,
	mustFindNodeByClass,
	mustFindNodeWithTag,
	searchNodeWithTag,
} from '#lib/xml.js'
import { makeParagraphsCompact } from '#lib/parsing/helperteam/text.js'
import { statTextToCodeChecked } from '#lib/parsing/stats.js'
import {
	addLangItems,
	checkedWeaponTypeCode,
	ensureSame,
	getHoneyPage,
	makeLangMap,
	mustCountRarityStars,
	mustGetIdAndName,
	mustGetImgUrl,
	mustGetItem,
	mustGetJSTable,
	mustGetJSTableRows,
} from './common.js'
import { groupItemsByCraft } from './items.js'
import { applyItemsPostFixes } from './fixes.js'
import { trimLines } from '#lib/utils/strings.js'

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

	// обсновные данные оружия со страниц со списками оружий
	for (const lang of langs) {
		/**
		 * @param {import('#lib/xml').Node} root
		 * @param {string} type
		 * @param {RegExp} titleRe
		 * @returns {WeaponLang[]}
		 */
		function getFromTable(root, type, titleRe) {
			const table = mustGetJSTableRows(root, titleRe, 'section-table')

			return tryWithContext(`${type}-weapon`, 'skipping', [], setLogPrefix => {
				return table.rows.map((cells, rowIndex) => {
					const nameCell = cells[table.mustGetColIndex('Name')]
					const { id, name } = mustGetIdAndName(nameCell, /\/i_(n\d+)/, rowIndex)

					setLogPrefix(`weapon '${name}'`)

					const rarityCell = cells[table.mustGetColIndex('Rarity')]
					const rarity = mustCountRarityStars(rarityCell, null, 'cur_icon', false)

					const materialCodes = []
					searchNodeWithTag(cells[table.mustGetColIndex('Ascension Materials')], 'a', node => {
						tryWithContext(`weapon '${name}' material`, 'skipping', null, () => {
							const item = mustGetItem(node.attrs.href ?? '', id2item)
							materialCodes.push(withMaxRarityInGroup(item).code)
						})
						return 'skip-children'
					})

					let specialAbility = getTextContent(cells[table.mustGetColIndex('Weapon Affix')]).trim()
					specialAbility = fixes.descriptionLangFix(specialAbility, lang)

					const iconCell = cells[table.mustGetColIndex('Icon')]
					const img = mustGetImgUrl(iconCell, `weapons row #${rowIndex + 1}`)
					return { type, id, name, rarity, materialCodes, specialAbility, img }
				})
			})
		}
		for (const type of GI_WEAPON_TYPE_CODES) {
			const root = await getHoneyPage('fam_' + type, cacheDir, lang)
			addLangItems(id2langWeapon, lang, await getFromTable(root, type, /^Weapons$/i))
			addLangItems(id2langUpcoming, lang, await getFromTable(root, type, /^Test\s+Weapons$/i))
		}
	}
	for (const [id, weapon] of id2langUpcoming.entries()) {
		const fix = fixes.statuses.weapons.find(x => x.actually === 'released' && x.name === weapon.en.name)
		if (fix) {
			fix._used = true
			id2langWeapon.set(id, weapon)
		}
	}
	for (const [id, weapon] of id2langWeapon.entries()) {
		const fix = fixes.statuses.weapons.find(x => x.actually === 'unreleased' && x.name === weapon.en.name)
		if (fix) {
			fix._used = true
			id2langWeapon.delete(id)
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
			description: {},
			story: {},
			specialAbility: makeLangMap(langWeapon, 'specialAbility'),
			materialCodes: ensureSame(langWeapon, 'materialCodes'),
			obtainSources: [],
		}
		code2weapon[code] = weapon
		id2weapon.set(id, weapon)
		code2img.set(code, ensureSame(langWeapon, 'img'))
	}
	sortObject(code2weapon, ([codeA], [codeB]) => codeA.localeCompare(codeB))

	// статы на уровнях, описания, история
	progress() //парсинг описаний довольно долгий
	for (const [id, weapon] of id2weapon) {
		/** @type {Record<string, {description:string, story:import('../helperteam/text').CompactTextParagraphs}>} */
		const extras = {}

		for (const lang of langs) {
			extras[lang] = { description: '', story: '' }
			const extra = extras[lang]
			const wCode = weapon.code
			const root = await getHoneyPage(`i_${id}`, cacheDir, lang)

			// описание, тип сабстата
			let subStatType = null
			const mainTable = mustFindNodeByClass(root, 'main_table')
			const mainTBody = mustFindNodeWithTag(mainTable, 'tbody')
			forEachTBodyRow(mainTBody, (row, cells, rowIndex) => {
				const title = getTextContent(cells[1]).trim()
				if (title === 'Substat Type') {
					subStatType = getTextContent(cells[2]).trim()
				} else if (title === 'Description') {
					extra.description = getTextContent(cells[2]).trim()
				}
			})

			// главстаты, сабстаты
			if (lang === 'en') {
				// звголовок у таблицы тут скрытый
				const table = mustGetJSTable(root, /Weapon Stats/, 'section-table')
				const tbody = mustFindNodeWithTag(table.table, 'tbody')
				forEachTBodyRow(tbody, (row, cells, rowIndex) => {
					const lvl = mustParseInt(cells[table.mustGetColIndex('Lv')])
					const atk = mustParseInt(cells[table.mustGetColIndex('Atk')])
					const sub = subStatType ? mustParseInt(cells[table.mustGetColIndex('Atk') + 1]) : null
					if (lvl === 1) {
						weapon.atk.base = atk
						if (sub !== null) {
							const code = statTextToCodeChecked(subStatType, `of weapon '${wCode}'`)
							weapon.subStat = { code, base: sub, max: sub }
						}
					}
					weapon.atk.max = atk
					if (weapon.subStat && sub !== null) weapon.subStat.max = sub
				})

				// У хонихантеров бонус процента атаки подписан как "ATK", при этом
				// значения бонуса явно низкие для обычного (непроцентного) бонуса: на 90 лвле ­— до 55.
				// Поэтому "atk" с небольшим значением на макс.лвле считаем за "atk%".
				if (weapon.subStat?.code === 'atk' && weapon.subStat.max < 80) {
					throw 2 //TODO weapon.subStat.code = 'atk%'
				}
				// аналогично для хп
				if (weapon.subStat?.code === 'hp' && weapon.subStat.max < 80) {
					throw 3 //TODO weapon.subStat.code = 'hp%'
				}
			}

			// история
			tryWithContext(`weapon '${wCode}' #${id} story`, 'skipping', null, () => {
				// звголовок у таблицы тут скрытый
				const table = mustGetJSTable(root, /Item Story/, 'section-table')
				extra.story = makeParagraphsCompact(
					getMultilineTextContent(table.table)
						.trim()
						.split(/\n[\n\s]*\n/)
						.map(x => ({ p: trimLines(x) })),
				)
			})
		}

		weapon.description = makeLangMap(extras, 'description')
		weapon.story = makeLangMap(extras, 'story')
	}
	applyItemsPostFixes(fixes.postProcess.weapons, id2weapon, code2weapon)
	return { code2item: code2weapon, code2img }
}

/** @param {import('#lib/xml').Node} node */
function mustParseInt(node) {
	const text = getTextContent(node)
	const val = parseInt(text)
	if (isNaN(val)) throw new Error(`wrong int '${text}'`)
	return val
}
