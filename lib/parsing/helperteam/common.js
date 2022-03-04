import { debuglog } from 'util'
import { warn } from '#lib/utils/logs.js'
import { appendTextAsStringOrP } from './text.js'
import { trigramMustGetWithThresh } from '#lib/trigrams.js'

/** @typedef {import('#lib/trigrams').TrigramSearcher<string>} TrigramCodesSearcher */
/** @typedef {{artifacts:TrigramCodesSearcher, weapons:TrigramCodesSearcher}} KnownItemCodes */

const typoLog = debuglog('typo')

/**
 * @param {string} line
 * @param {import('./types').BottomNotes<'monolang'>} obj
 * @param {(remainingLine:string) => string|null} [extraHandleFunc]
 */
export function parseNotesLine(line, obj, extraHandleFunc) {
	const seeCharNotesOrig = obj.seeCharNotes
	while (line) {
		let m
		if ((m = line.match(/^\*+(?:check notes|read notes)\**$/i)) !== null) {
			// '**check notes' / '*check notes*' / '*read notes' / ...
			obj.seeCharNotes = true
			line = line.slice(m[0].length).trim()
		} else if ((m = line.match(/^(Refer to Notes below)/i)) !== null) {
			obj.seeCharNotes = true
			line = line.slice(m[0].length).trim()
		} else if (extraHandleFunc && (m = extraHandleFunc(line)) !== null) {
			line = m
		} else {
			if ((m = line.match(/^\*+/)) !== null) {
				line = line.slice(m[0].length).trim()
				// под (например) талантами есть камент, начинаующийся с "*"; если звёздочка
				// уже была напротив строки с талантом (выше), она указывала на этот камент, а не на заметки песонажа
				if (seeCharNotesOrig) obj.seeCharNotes = false
			}
			if ((m = line.match(/^\((.+)\)$/)) !== null) line = m[1].trim() // '(smth)' -> 'smth'
			obj.notes = appendTextAsStringOrP(obj.notes, line)
			line = ''
		}
	}
}

/**
 * @param {TrigramCodesSearcher} searcher
 * @param {string} code
 * @param {string} logPrefix
 * @returns {string}
 */
export function tryFixCode(searcher, code, logPrefix) {
	let res
	try {
		res = trigramMustGetWithThresh(searcher, code, code => code)
	} catch (ex) {
		warn(`${logPrefix}: can not fix code: ${ex}`)
		return code
	}
	if (res !== code) typoLog('fixed code: %s -> %s', code, res)
	return res
}
