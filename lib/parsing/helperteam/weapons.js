import { getWeaponCodeFromName } from '#lib/genshin.js'
import { json_extractText, json_findCellIndex, json_getText, json_mustFindCellIndex } from './json.js'
import { statTextToCodeChecked } from './stats.js'
import { getCodeChecked, getLangValue, parseNotesLine } from './common.js'
import { warn } from '#lib/utils.js'

/** @typedef {{code:string, value1:number, value90:number}} WeaponInfoStat */

/**
 * @typedef {{
 *   code: string,
 *   typeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   mainStat: WeaponInfoStat,
 *   subStat: WeaponInfoStat,
 *   passiveStat: import('./json').OneOrMoreTextNodes,
 * }} WeaponInfo
 */

/** @typedef {{code:string, refine:string|null, stacks:number|null} & import('./common').BottomNotes} WeaponRef */

/** @typedef {{similar:WeaponRef[]}} SimilarWeaponAdvice */

/** @typedef {{advices:SimilarWeaponAdvice[]} & import('./common').BottomNotes} WeaponAdvices */

/** @typedef {WeaponInfo & {name:string, rarity:import('#lib/genshin').GI_RarityCode}} WeaponFullInfo */

/**
 * @param {import('#lib/google').Sheet} sheet
 * @param {import('#lib/genshin').GI_WeaponTypeCode} typeCode
 * @param {import('./common').TrigramCodesSearcher} knownCodes
 * @returns {WeaponInfo[]}
 */
export function json_extractWeaponsInfo(sheet, typeCode, knownCodes) {
	/**
	 * @typedef {{
	 *   nameCol: number,
	 *   mainStatCol: number,
	 *   subStatCol: number,
	 *   passiveCol: number,
	 * }} WeaponBlock
	 */

	const weapons = /**@type {WeaponInfo[]}*/ ([])
	let block = /**@type {WeaponBlock|null}*/ (null)

	function warnType(msg) {
		warn(`${msg} in '${typeCode}' weapons`)
	}
	for (const { values: cells = [] } of sheet.data[0].rowData) {
		let _col
		if ((_col = json_findCellIndex(cells, /^main stat\s*\(1\/90\)$/i)) !== -1) {
			block = {
				nameCol: json_mustFindCellIndex(cells, /^name$/i),
				mainStatCol: _col,
				subStatCol: json_mustFindCellIndex(cells, /^sub stat\s*\(1\/90\)$/i),
				passiveCol: json_mustFindCellIndex(cells, /^Passive\s*\(R1\/R5\)$/i),
			}
		} else if (block && cells.length > block.passiveCol) {
			let name = json_getText(cells[block.nameCol]).replace(/\s+/g, ' ').trim().toLocaleLowerCase()
			let mainStatStr = json_getText(cells[block.mainStatCol]).trim()
			if (name && mainStatStr) {
				const code = getCodeChecked(getWeaponCodeFromName, knownCodes, name)
				const mainStat = parseWeaponStat(mainStatStr)
				const subStat = parseWeaponStat(json_getText(cells[block.subStatCol]))
				const passiveStat = json_extractText(cells[block.passiveCol])
				if (mainStat instanceof Error) warnType(mainStat.message + ` of '${name}'`)
				else if (subStat instanceof Error) warnType(subStat.message + ` of '${name}'`)
				else weapons.push({ code, typeCode, mainStat, subStat, passiveStat })
			}
		}
	}
	return weapons
}

/**
 * @param {string[]} lines
 * @param {import('./common').TrigramCodesSearcher} codeSearcher
 * @param {string} characterCode
 * @param {import('./fixes').HelperteamFixes} fixes
 * @returns {WeaponAdvices}
 */
export function extractWeaponRefs(lines, codeSearcher, characterCode, fixes) {
	const advices = /**@type {WeaponAdvices}*/ ({ advices: [], notes: null, seeCharNotes: false })

	function warnOnCharacter(msg) {
		warn(`${msg} of character '${characterCode}'`)
	}

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		function warnOnLine(msg) {
			warnOnCharacter(`${msg} in line '${line}'`)
		}

		const m = line.match(/^\d+\.\s*(.*)$/)
		if (m) {
			const similarRef = /**@type {SimilarWeaponAdvice}*/ ({ similar: [] })

			let text = m[1]
			while (true) {
				text = text.trim()
				if (!text) break

				let m = text.match(/^(.+?)\(\d\s*[⭐✩]\)/)
				if (!m) break
				text = text.slice(m[0].length).trim()

				let name = m[1].trim()
				let refine = null
				let stacks = null
				let seeCharNotes = false

				const setRefine = (/** @type {RegExpMatchArray} */ m) => {
					if (refine) warnOnLine(`'${name}' refinement re-definition`)
					refine = m[1]
				}
				name = cutEndAnd(name, / \[(r\d\+?)\]$/i, setRefine)
				name = cutEndAnd(name, / \[(r\d-r\d)\]$/i, setRefine)
				name = cutEndAnd(name, / \[?(r\d)\]?$/i, setRefine)
				text = cutStartAnd(text, /^\[(r\d\+?)\]/i, setRefine)
				text = cutStartAnd(text, /^\[(r\d-r\d)\]/i, setRefine)

				const setStacks = (/** @type {RegExpMatchArray} */ m) => {
					if (stacks) warnOnLine(`'${name}' stacks re-definition`)
					stacks = parseInt(m[1], 10)
				}
				name = cutEndAnd(name, / \((\d) stacks?\)?$/i, setStacks)
				text = cutStartAnd(text, /^\((\d) stacks?\)/i, setStacks)
				text = cutStartAnd(text, /^s(\d)/i, setStacks)

				text = cutStartAnd(text, /^\*/i, m => (seeCharNotes = true))
				text = cutStartAnd(text, /^~?=/i, m => undefined)

				// const rawCode = getWeaponCodeFromName(name)
				// let code = code2weapon.has(rawCode) ? rawCode : null
				// if (!code) {
				// 	for (const fix of fixes.charactersWeaponsMatch) {
				// 		if (!fix.characterCodes.includes(characterCode)) continue
				// 		const fixedCode = getWeaponCodeFromName(name.replace(fix.replace, fix.with))
				// 		if (code2weapon.has(fixedCode)) {
				// 			code = fixedCode
				// 			fix._used = true
				// 			break
				// 		}
				// 	}
				// }
				const code = getCodeChecked(getWeaponCodeFromName, codeSearcher, name)
				similarRef.similar.push({ code, refine, stacks, notes: null, seeCharNotes })
			}

			// проверяем остальной текст в строке, обычно это "*" и "см. заметки"
			while (text) {
				let m
				const lastRef = similarRef.similar.at(-1)
				if (text.startsWith('*') && lastRef) {
					lastRef.seeCharNotes = true
					text = text.slice(1).trim()
				} else if ((m = text.match(/^\[r(\d)\]/i)) !== null && lastRef) {
					if (lastRef.refine) warnOnLine(`refinement re-definition`)
					lastRef.refine = m[1]
					text = text.slice(m[0].length).trim()
				} else if ((m = text.match(/^\(Shielded\)/i)) !== null && lastRef) {
					lastRef.notes = ((lastRef.notes ?? '') + '\nshielded').trim()
					text = text.slice(m[0].length).trim()
				} else {
					warnOnLine(`unexpected line remainder '${text}'`)
					break
				}
			}

			advices.advices.push(similarRef)
		} else {
			parseNotesLine(line, advices)
		}
	}

	return advices
}

/**
 * @param {WeaponAdvices[]} weaponRefsArr
 * @param {Map<string,import('#lib/genshin').GI_WeaponTypeCode>} weaponCode2typeCode
 * @param {string} characterCode
 * @returns {import('#lib/genshin').GI_WeaponTypeCode}
 */
export function getWeaponTypeCode(weaponRefsArr, weaponCode2typeCode, characterCode) {
	const weaponTypes = new Set()
	for (const weaponRefs of weaponRefsArr)
		for (const advice of weaponRefs.advices)
			for (const similar of advice.similar) {
				const typeCode = weaponCode2typeCode.get(similar.code)
				if (typeCode) weaponTypes.add(typeCode)
			}
	if (weaponTypes.size === 0) {
		const code = 'claymore'
		warn(`can not get weapon type for character '${characterCode}', using '${code}'`)
		return code
	}
	const codes = Array.from(weaponTypes)
	const code = codes[0]
	if (weaponTypes.size > 1)
		warn(`got multiple weapon types (${codes}) for character '${characterCode}', using '${code}'`)
	return code
}

/**
 * @param {WeaponInfo} weapon
 * @param {import('#lib/parsing').WeaponsInfo} weaponsInfo
 * @param {string} lang
 * @returns {WeaponFullInfo}
 */
export function makeWeaponFullInfo(weapon, weaponsInfo, lang) {
	let name = weapon.code
	let rarity = /** @type {import('#lib/genshin').GI_RarityCode} */ (1)
	const info = weaponsInfo[weapon.code]
	if (info) {
		name = getLangValue(info.name, lang, weapon.code, 'name', weapon.code)
		rarity = info.rarity
	} else {
		warn(`can not get weapon full info: '${weapon.code}' not found`)
	}
	return Object.assign({ name, rarity }, weapon)
}

/**
 * @param {string} text
 * @param {RegExp} re
 * @param {(match:RegExpMatchArray) => unknown} func
 */
function cutEndAnd(text, re, func) {
	const m = text.match(re)
	if (m !== null) {
		text = text.slice(0, -m[0].length).trimEnd()
		func(m)
	}
	return text
}
/**
 * @param {string} text
 * @param {RegExp} re
 * @param {(match:RegExpMatchArray) => unknown} func
 */
function cutStartAnd(text, re, func) {
	const m = text.match(re)
	if (m !== null) {
		text = text.slice(m[0].length).trimStart()
		func(m)
	}
	return text
}

/**
 * @param {string} statStr
 * @returns {WeaponInfoStat|Error}
 */
function parseWeaponStat(statStr) {
	const m = statStr.trim().match(/^([^:]+):(.+)\/(.+)$/)
	const value1 = m && parseFloat(m[2].trim())
	const value90 = m && parseFloat(m[3].trim())
	if (!m || !value1 || !value90) return new Error(`can not parse '${statStr}'`)

	const code = statTextToCodeChecked(m[1], `in weapon stat '${statStr}`)
	return { code, value1, value90 }
}
