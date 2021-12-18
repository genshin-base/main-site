import { warn } from '#lib/utils.js'
import { debuglog } from 'util'

/** @typedef {import("./json").OneOrMoreTextNodes} OneOrMoreTextNodes */

/** @typedef {{notes:import("./json").OneOrMoreTextNodes|null, seeCharNotes:boolean}} BottomNotes */

/** @typedef {import('#lib/trigrams').TrigramSearcher<string>} TrigramCodesSearcher */
/** @typedef {{artifacts:TrigramCodesSearcher, weapons:TrigramCodesSearcher}} KnownItemCodes */

const typoLog = debuglog('typo')

/**
 * @param {string} line
 * @param {BottomNotes} obj
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
			obj.notes = addTextAsStringOrP(obj.notes, line)
			line = ''
		}
	}
}

/**
 * @param {OneOrMoreTextNodes|null} curBlocks
 * @param {string} newBlock
 * @returns {OneOrMoreTextNodes}
 */
export function addTextAsStringOrP(curBlocks, newBlock) {
	if (curBlocks === null) return newBlock
	if (typeof curBlocks === 'string') return [{ p: curBlocks }, { p: newBlock }]
	if ('p' in curBlocks) return [curBlocks, { p: newBlock }]
	if (Array.isArray(curBlocks)) return [...curBlocks, { p: newBlock }]
	return [{ p: curBlocks }, { p: newBlock }]
}

/**
 * @param {{code:string}} obj
 * @param {import('#lib/parsing').ItemsLangNames} langNames
 * @param {string} lang
 */
export function nameOrCode(obj, langNames, lang) {
	const names = langNames[obj.code]
	const name = names?.[lang]
	if (name === undefined) warn(`can not find ${lang}-name for '${obj.code}', using code`)
	return name ?? obj.code
}

/**
 * @param {TrigramCodesSearcher} searcher
 * @param {string} code
 * @returns {string}
 */
export function tryFixCode(searcher, code) {
	const top = searcher.getN(code, 2)
	if (top.length === 0) {
		warn(`can not fix code '${code}': searcher is empty`)
		return code
	}
	const first = top[0]
	if (first.sim < 0.3) {
		warn(`can not fix code '${code}': best match '${first.val}' (${first.sim}) is too different`)
		return code
	}
	if (top.length > 1) {
		const second = top[1]
		const delta = first.sim - second.sim
		if (delta < 0.1) {
			warn(
				`can not fix code '${code}': best match ${triSearchResStr(first)} ` +
					`is too similar to ${triSearchResStr(second)}`,
			)
			return code
		}
	}
	if (first.val !== code) typoLog('%s -> %s', code, first.val)
	return first.val
}
/** @param {{sim:number, val:string}} res */
function triSearchResStr(res) {
	return `'${res.val}' (${res.sim})`
}

/**
 * @template T
 * @param {(rawValue:T) => string} fromFunc
 * @param {TrigramCodesSearcher} searcher
 * @param {T} rawValue
 * @returns
 */
export function getCodeChecked(fromFunc, searcher, rawValue) {
	return tryFixCode(searcher, fromFunc(rawValue))
}
