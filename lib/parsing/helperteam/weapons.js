import { getWeaponCodeFromName } from '#lib/genshin.js'
import { json_extractText, json_findCellIndex, json_getText, json_mustFindCellIndex } from './json.js'
import { statTextToCodeChecked } from '#lib/parsing/stats.js'
import { getCodeChecked, parseNotesLine } from './common.js'
import { tryWithContext, warn } from '#lib/utils/logs.js'

/**
 * @param {import('#lib/google').Sheet} sheet
 * @param {import('#lib/genshin').GI_WeaponTypeCode} typeCode
 * @param {import('./common').TrigramCodesSearcher} knownCodes
 * @returns {import('./types').WeaponInfo<'monolang'>[]}
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

	const weapons = /**@type {import('./types').WeaponInfo<'monolang'>[]}*/ ([])
	let block = /**@type {WeaponBlock|null}*/ (null)

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
			const name = json_getText(cells[block.nameCol]).replace(/\s+/g, ' ').trim().toLocaleLowerCase()
			const mainStatStr = json_getText(cells[block.mainStatCol]).trim()
			if (name && mainStatStr) {
				const block_ = block
				tryWithContext(`${typeCode} weapons: ${name}`, 'skipping weapon', null, () => {
					const code = getCodeChecked(getWeaponCodeFromName, knownCodes, name, 'weapons sheet')
					const mainStat = mustParseWeaponStat(mainStatStr)
					const subStat = mustParseWeaponStat(json_getText(cells[block_.subStatCol]))
					const passiveStat = json_extractText(cells[block_.passiveCol])
					weapons.push({ code, typeCode, mainStat, subStat, passiveStat })
				})
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
 * @returns {import('./types').WeaponAdvices<'monolang'>}
 */
export function extractWeaponRefs(lines, codeSearcher, characterCode, fixes) {
	const advices = /**@type {import('./types').WeaponAdvices<'monolang'>}*/ ({
		advices: [],
		notes: null,
		seeCharNotes: false,
	})

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
			/** @type {import('./types').SimilarWeaponAdvice<'monolang'>} */
			const similarRef = { similar: [] }

			let text = m[1]
			while (true) {
				text = text.trim()
				if (!text) break

				const m = text.match(/^(.+?)\(\d\s*[⭐✩]\)/)
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

				const logPrefix = `${characterCode} weapons`
				const code = getCodeChecked(getWeaponCodeFromName, codeSearcher, name, logPrefix)
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
 * @returns {import('./types').WeaponInfoStat}
 */
function mustParseWeaponStat(statStr) {
	const m = statStr.trim().match(/^([^:]+):(.+)\/(.+)$/)
	const value1 = m && parseFloat(m[2].trim())
	const value90 = m && parseFloat(m[3].trim())
	if (!m || !value1 || !value90) throw new Error(`can not parse '${statStr}'`)

	const code = statTextToCodeChecked(m[1], `in weapon stat '${statStr}`)
	return { code, value1, value90 }
}
