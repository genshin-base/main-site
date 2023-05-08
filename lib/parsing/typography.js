import { updateTextNodesText } from './helperteam/text.js'

/**
 * @template {Record<string, import("./helperteam/text").CompactTextParagraphs>} T
 * @param {T} text
 * @returns {T}
 */
export function fixTextTypography(text) {
	for (const lang in text) text[lang] = fixSingleLang(lang, text[lang])
	return text
}

/**
 * @template {import("./helperteam/text").CompactTextParagraphs} T
 * @param {string} lang
 * @param {T} node
 * @returns {T}
 */
function fixSingleLang(lang, node) {
	if (typeof node === 'string') return /**@type {T}*/ (fixPlainText(lang, node))
	updateTextNodesText(node, text => fixPlainText(lang, text))
	return node
}

/**
 * @param {string} lang
 * @param {string} text
 * @returns {string}
 */
function fixPlainText(lang, text) {
	text = text.replaceAll('...', '…')
	if (lang === 'en') {
		text = text
			.replaceAll(` 'tis `, ` ’tis `) //
			.replace(/(?<=[\w█])'/g, '’')
		text = fixPairQuotes(text, { '"': `“”`, "'": `‘’` }, /[\w█]/)
	} else if (lang === 'ru') {
		text = text
			.replaceAll(`?"»`, `?”»`)
			.replace(/(\s)-(\s|\n|$)/g, '$1–$2') //TODO: —
			.replace(/(^|\n)- /g, '$1– ') //диалог
		text = fixPairQuotes(text, { '"': `“”` }, /[а-яА-ЯёЁ]/)
	}
	return text
}

/**
 * @param {string} text
 * @param {Record<string,string>} map
 * @param {RegExp} letterRe
 */
function fixPairQuotes(text, map, letterRe) {
	for (let i = 0; i < text.length; i++) {
		const char = text[i]
		if (char in map) {
			const pair = map[char]
			const prev = i > 0 ? text[i - 1] : '\n'
			const next = i < text.length - 1 ? text[i + 1] : '\n'
			const prevPriority = letterRe.test(prev) ? 2 : !/\s/.test(prev) ? 1 : 0
			const nextPriority = letterRe.test(next) ? 2 : !/\s/.test(next) ? 1 : 0
			// if (prev === 'и') console.log(char, pair, prev, next, prevPriority, nextPriority, text)
			if (prevPriority !== nextPriority) {
				text = text.slice(0, i) + pair[prevPriority < nextPriority ? 0 : 1] + text.slice(i + 1)
			}
		}
	}
	return text
}
