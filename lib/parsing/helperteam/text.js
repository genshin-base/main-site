import { arrItemIfSingle } from '#lib/utils/collections.js'
import { mustBeNever } from '#lib/utils/values.js'
import { marked } from 'marked'

/** @typedef {{p:OneOrMoreInlineTextNodes}} TextNodeP */

/** @typedef {{b:TextNodeInline}} TextNodeB */
/** @typedef {{i:TextNodeInline}} TextNodeI */
/** @typedef {{s:TextNodeInline}} TextNodeS */
/** @typedef {{a:TextNodeInline, href:string}} TextNodeA */
/** @typedef {{weapon:TextNodeInline, code:string}} TextNodeWeapon */
/** @typedef {{artifact:TextNodeInline, code:string}} TextNodeArtifact */
/** @typedef {{item:TextNodeInline, code:string}} TextNodeItem */

/** @typedef {TextNodeB|TextNodeI|TextNodeS|TextNodeA|TextNodeWeapon|TextNodeArtifact|TextNodeItem|string} TextNodeInline */

/** @typedef {TextNodeInline|TextNodeP} TextNode */
/** @typedef {TextNode|TextNode[]} OneOrMoreTextNodes */

/** @typedef {TextNodeInline|TextNodeInline[]} OneOrMoreInlineTextNodes */
/** @typedef {OneOrMoreInlineTextNodes|TextNodeP|TextNodeP[]} CompactTextParagraphs */

/**
 * @param {CompactTextParagraphs|null} curBlock
 * @param {CompactTextParagraphs} newBlock
 * @returns {CompactTextParagraphs}
 */
export function appendTextAsStringOrP(curBlock, newBlock) {
	if (curBlock === null) return newBlock
	return concatParagraphs(curBlock, newBlock)
}

/**
 * @param {CompactTextParagraphs[]} items
 * @returns {TextNodeP[]}
 */
function concatParagraphs(...items) {
	const res = []
	for (const item of items) {
		if (isParagraphArr(item)) res.push(...item)
		else if (typeof item !== 'string' && 'p' in item) res.push(item)
		else res.push({ p: item })
	}
	return res
}

/**
 * @param {OneOrMoreInlineTextNodes[]} items
 * @returns {TextNodeInline[]}
 */
function concatInlines(...items) {
	const res = []
	for (const item of items)
		if (Array.isArray(item)) res.push(...item)
		else res.push(item)
	return res
}

/** @param {TextNode[]} nodes */
function countParagraphs(nodes) {
	let pCount = 0
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i]
		if (typeof node !== 'string' && 'p' in node) pCount++
	}
	return pCount
}
/**
 * @param {CompactTextParagraphs} node
 * @returns {node is TextNodeP[]}
 */
function isParagraphArr(node) {
	if (!Array.isArray(node)) return false
	return countParagraphs(node) === node.length
}

/**
 * @param {OneOrMoreInlineTextNodes} newNode
 * @param {CompactTextParagraphs} destNode
 * @returns {CompactTextParagraphs}
 */
export function prependTextIntoP(newNode, destNode) {
	if (isParagraphArr(destNode)) return [{ p: concatInlines(newNode, destNode[0].p) }, ...destNode.slice(1)]

	if (typeof destNode !== 'string' && 'p' in destNode) return { p: concatInlines(newNode, destNode.p) }

	return concatInlines(newNode, destNode)
}

/**
 * @param {TextNodeInline} node
 * @returns {TextNodeInline}
 */
export function getTextNodeInlineChildren(node) {
	if (typeof node === 'string') return node
	if ('b' in node) return node.b
	if ('i' in node) return node.i
	if ('s' in node) return node.s
	if ('a' in node) return node.a
	if ('weapon' in node) return node.weapon
	if ('artifact' in node) return node.artifact
	if ('item' in node) return node.item
	mustBeNever(node)
}
/**
 * @param {TextNode} node
 * @returns {CompactTextParagraphs}
 */
export function getTextNodeChildren(node) {
	if (typeof node !== 'string' && 'p' in node) return node.p
	return getTextNodeInlineChildren(node)
}

/**
 * @param {OneOrMoreTextNodes} nodes
 * @returns {number}
 */
export function getTextLength(nodes) {
	if (Array.isArray(nodes)) return nodes.map(getTextLength).reduce((a, b) => a + b)
	if (typeof nodes === 'string') return nodes.length
	return getTextLength(getTextNodeChildren(nodes))
}

/**
 * @param {OneOrMoreTextNodes} node
 * @returns {boolean}
 */
export function isTextBlank(node) {
	if (typeof node === 'string') return node === ''
	if (Array.isArray(node)) return node.length === 0 || (node.length === 1 && isTextBlank(node[0]))
	return isTextBlank(getTextNodeChildren(node))
}

/**
 * @param {OneOrMoreInlineTextNodes} node
 * @returns {string}
 */
export function getInlineText(node) {
	if (typeof node === 'string') return node
	if (Array.isArray(node)) return node.map(getInlineText).join('')
	return getInlineText(getTextNodeInlineChildren(node))
}

/**
 * @param {OneOrMoreTextNodes} nodes
 * @returns {Generator<TextNode, void, void>}
 */
export function* walkTextNodes(nodes) {
	if (Array.isArray(nodes)) {
		for (const node of nodes) yield* walkTextNodes(node)
	} else {
		yield nodes
		const children = getTextNodeChildren(nodes)
		if (children !== nodes) yield* walkTextNodes(getTextNodeChildren(nodes))
	}
}

/**
 * @param {CompactTextParagraphs} node
 * @returns {string}
 */
export function textNodesToMarkdown(node) {
	// return limitLinesWidth(textNodesToMarkdownInner(node), 80)
	return textNodesToMarkdownInner(node)
}
/**
 * @param {CompactTextParagraphs} node
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
/** @param {TextNodeInline[]} nodes */
function groupedInlineNodesToMarkdown(nodes) {
	const res = []
	const sameNodes = /**@type {(TextNodeB|TextNodeI|TextNodeS)[]}*/ ([])
	function flush() {
		if (sameNodes.length > 0) res.push(sameInlineNodesToMarkdown(sameNodes))
		sameNodes.length = 0
	}
	/** @param {TextNodeB|TextNodeI|TextNodeS} node */
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
/** @param {(TextNodeB|TextNodeI|TextNodeS)[]} nodes */
function sameInlineNodesToMarkdown(nodes) {
	if ('b' in nodes[0]) return '**' + (/**@type {TextNodeB[]}*/(nodes)).map(x => textNodesToMarkdownInner(x.b)).join('') + '**' //prettier-ignore
	if ('i' in nodes[0]) return '_'  + (/**@type {TextNodeI[]}*/(nodes)).map(x => textNodesToMarkdownInner(x.i)).join('') + '_' //prettier-ignore
	if ('s' in nodes[0]) return '~~' + (/**@type {TextNodeS[]}*/(nodes)).map(x => textNodesToMarkdownInner(x.s)).join('') + '~~' //prettier-ignore
	mustBeNever(nodes[0])
}
/** @param {string|TextNodeA|TextNodeWeapon|TextNodeArtifact|TextNodeItem} node */
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
 * @returns {CompactTextParagraphs}
 */
export function textNodesFromMarkdown(text) {
	const tokens = new marked.Lexer().lex(text)

	const paragraphs = /** @type {TextNodeP[]} */ ([])
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
 * @returns {Generator<TextNodeInline, void, void>}
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
 * @returns {Generator<TextNodeInline, void, void>}
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
