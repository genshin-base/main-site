import { marked } from 'marked'
import { arrItemIfSingle } from '#lib/utils/collections.js'
import { mustBeNever } from '#lib/utils/values.js'
import { isParagraphArr } from './text.js'

/** @typedef {import('./text').TextNodeB|import('./text').TextNodeI|import('./text').TextNodeS} TextNodeGroupable */

/**
 * @param {import('./text').CompactTextParagraphs} node
 * @returns {string}
 */
export function textNodesToMarkdown(node) {
	// return limitLinesWidth(textNodesToMarkdownInner(node), 80)
	return textNodesToMarkdownInner(node)
}
/**
 * @param {import('./text').CompactTextParagraphs} node
 * @returns {string}
 */
function textNodesToMarkdownInner(node) {
	if (typeof node !== 'string') {
		if (isParagraphArr(node)) return node.map(x => textNodesToMarkdownInner(x)).join('\n\n')
		if ('p' in node) return textNodesToMarkdownInner(node.p).trim()
		if (Array.isArray(node)) return groupedInlineNodesToMarkdown(node)
	}

	return groupedInlineNodesToMarkdown([node])
}
/** @param {import('./text').TextNodeInline[]} nodes */
function groupedInlineNodesToMarkdown(nodes) {
	const res = []
	const sameNodes = /**@type {TextNodeGroupable[]}*/ ([])
	function flush() {
		if (sameNodes.length > 0) res.push(sameInlineNodesToMarkdown(sameNodes))
		sameNodes.length = 0
	}
	/** @param {TextNodeGroupable} node */
	const getType = node => ('b' in node ? 'b' : 'i' in node ? 'i' : 's' in node ? 's' : '')
	for (const node of nodes) {
		if (typeof node === 'string' || !('b' in node || 'i' in node || 's' in node)) {
			flush()
			res.push(inlineNodeToMarkdown(node))
		} else {
			if (sameNodes.length > 0 && getType(sameNodes[sameNodes.length - 1]) !== getType(node)) {
				flush()
			}
			sameNodes.push(node)
		}
	}
	flush()
	return res.join('')
}
/** @param {TextNodeGroupable[]} nodes */
function sameInlineNodesToMarkdown(nodes) {
	if ('b' in nodes[0]) return '**' + (/**@type {import('./text').TextNodeB[]}*/(nodes)).map(x => textNodesToMarkdownInner(x.b)).join('') + '**' //prettier-ignore
	if ('i' in nodes[0]) return '_'  + (/**@type {import('./text').TextNodeI[]}*/(nodes)).map(x => textNodesToMarkdownInner(x.i)).join('') + '_' //prettier-ignore
	if ('s' in nodes[0]) return '~~' + (/**@type {import('./text').TextNodeS[]}*/(nodes)).map(x => textNodesToMarkdownInner(x.s)).join('') + '~~' //prettier-ignore
	mustBeNever(nodes[0])
}
/** @param {Exclude<import('./text').TextNodeInline, TextNodeGroupable>} node */
function inlineNodeToMarkdown(node) {
	if (typeof node === 'string') return escapeMD(node).replace(/\n/g, '<br>\n')
	if ('a' in node) return `[${textNodesToMarkdownInner(node.a)}](${node.href})`
	if ('weapon' in node) return `[${textNodesToMarkdownInner(node.weapon)}](#weapon:${node.code})`
	if ('artifact' in node) return `[${textNodesToMarkdownInner(node.artifact)}](#artifact:${node.code})`
	if ('item' in node) return `[${textNodesToMarkdownInner(node.item)}](#item:${node.code})`
	mustBeNever(node)
}

/**
 * @param {string} text
 * @returns {import('./text').CompactTextParagraphs}
 */
export function textNodesFromMarkdown(text) {
	const tokens = new marked.Lexer().lex(text)

	const paragraphs = /** @type {import('./text').TextNodeP[]} */ ([])
	for (const token of tokens) {
		if (token.type === 'paragraph') {
			const inline = [...mustGetInlinesFromMDTokens(token.tokens)]
			if (inline.length > 0) paragraphs.push({ p: arrItemIfSingle(inline) })
			continue
		}
		if (token.type === 'space') continue

		const inline = [...mustGetInlinesFromMDTokens([token])]
		paragraphs.push({ p: arrItemIfSingle(inline) })
	}
	return paragraphs.length === 1 ? paragraphs[0].p : paragraphs
}
/**
 * @param {import('marked').marked.Token[]} tokens
 * @param {string|null} [prefix]
 * @param {string|null} [suffix]
 * @returns {Generator<import('./text').TextNodeInline, void, void>}
 */
function* mustGetInlinesFromMDTokens(tokens, prefix = null, suffix = null) {
	let prevTextNode = prefix
	for (const child of tokens)
		for (const sub of mustGetInlinesFromMDToken(child)) {
			if (typeof sub === 'string') {
				prevTextNode = (prevTextNode ?? '') + sub
			} else {
				if (prevTextNode !== null) yield prevTextNode.replace(/<br>\n?/g, '\n')
				prevTextNode = null
				yield sub
			}
		}
	if (suffix !== null) prevTextNode = (prevTextNode ?? '') + suffix
	if (prevTextNode !== null) yield prevTextNode.replace(/<br>\n?/g, '\n')
}
/**
 * @param {import('marked').marked.Token} token
 * @returns {Generator<import('./text').TextNodeInline, void, void>}
 */
function* mustGetInlinesFromMDToken(token) {
	switch (token.type) {
		case 'text':
			if ('tokens' in token && token.tokens) yield* mustGetInlinesFromMDTokens(token.tokens)
			else yield token.raw
			return
		case 'list':
			for (let i = 0; i < token.items.length; i++) {
				const item = token.items[i]
				const prefix = token.start === '' ? '- ' : token.start + i + '. '
				yield* mustGetInlinesFromMDTokens(item.tokens, prefix, '\n')
			}
			return
		case 'escape':
			return yield token.text
		case 'strong':
			for (const sub of mustGetInlinesFromMDTokens(token.tokens)) yield { b: sub }
			return
		case 'em':
			for (const sub of mustGetInlinesFromMDTokens(token.tokens)) yield { i: sub }
			return
		case 'del':
			for (const sub of mustGetInlinesFromMDTokens(token.tokens)) yield { s: sub }
			return
		case 'link':
			for (const sub of mustGetInlinesFromMDTokens(token.tokens)) {
				let m
				if ((m = token.href.match(/#weapon:(.*)/))) yield { weapon: sub, code: m[1] }
				else if ((m = token.href.match(/#artifact:(.*)/))) yield { artifact: sub, code: m[1] }
				else if ((m = token.href.match(/#item:(.*)/))) yield { item: sub, code: m[1] }
				else yield { a: sub, href: token.href }
			}
			return
		case 'html':
			if (token.raw.replace(/<br>/g, '').trim() === '') {
				return yield token.raw //.replace(/<br>/g, '\n')
			}
	}
	const msg = `unexpected markdown token '${token.type}' with text ${JSON.stringify(token.raw)}`
	throw new Error(msg)
}

/** @param {string} text */
function escapeMD(text) {
	return text.replace(/([_*\[\]~`|])/g, '\\$1')
}
