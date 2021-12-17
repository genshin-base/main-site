/** @typedef {import("./json").OneOrMoreTextNodes} OneOrMoreTextNodes */

/** @typedef {{notes:import("./json").OneOrMoreTextNodes|null, seeCharNotes:boolean}} BottomNotes */

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
	if (name === undefined) console.warn(`WARN: can not find ${lang}-name for '${obj.code}', using code`)
	return name ?? obj.code
}
