import { getWeaponCodeFromName } from '#lib/genshin.js'
import { parseNotesLine, tryFixCode } from './common.js'
import { warn } from '#lib/utils/logs.js'
import { forEachNonBlank } from '#lib/utils/strings.js'

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
		warn(`character '${characterCode}': ${msg}`)
	}

	// Описание аналогичного по полезности оружия иногда начинается с новой строки с "~=".
	// Склеиваем такую строку с предыдущей: так проще парсить.
	// ["foo", "~= bar"] -> ["foo ~= bar"]
	lines = lines.slice()
	for (let i = 1; i < lines.length; i++) {
		if (/^\s*~=/.test(lines[i])) {
			lines[i - 1] += ' ' + lines[i]
			lines.splice(i--, 1)
		}
	}

	forEachNonBlank(lines, (line, prevWasBlank) => {
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

				const m = text.match(/^(.+?)\(\d\s*[⭐✩☆]\)/)
				if (!m) break
				text = text.slice(m[0].length).trim()

				let name = m[1].trim()
				let refine = null
				let stacks = null
				let seeCharNotes = false

				text = cutStartAnd(text, /^\*/i, m => (seeCharNotes = true))

				const setRefine = (/** @type {RegExpMatchArray} */ m) => {
					if (refine) warnOnLine(`'${name}' refinement re-definition`)
					refine = normalizeRefine(m[1])
				}
				// перед звёздочкой
				name = cutEndAnd(name, / \[?(r\d\+?)\]?$/i, setRefine)
				name = cutEndAnd(name, / \[?(r\d-r\d)\]?$/i, setRefine)
				// посе звёздочки
				text = cutStartAnd(text, /^\[?(r\d\+?)\]?/i, setRefine)
				text = cutStartAnd(text, /^\[?(r\d-r\d)\]?/i, setRefine)

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
				const code = tryFixCode(codeSearcher, getWeaponCodeFromName(name), logPrefix)
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
			const lastAdvice = advices.advices.at(-1)?.similar?.at(-1)
			const dest = !prevWasBlank && lastAdvice ? lastAdvice : advices
			parseNotesLine(line, dest)
		}
	})

	if (advices.advices.length === 0) warnOnCharacter(`no weapon advices`)
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
 * R1 -> 1
 * R1-2 -> 1-2
 * R1-R2 -> 1-2
 * R1+ -> 1+
 * @param {string} label
 */
function normalizeRefine(label) {
	return label.replace(/r/gi, '')
}
