import { limitLinesWidth } from '#lib/utils/strings.js'
import { mustBeNever } from '#lib/utils/values.js'

/** @typedef {{p:OneOrMoreInlineTextNodes}} TextNodeP */

/** @typedef {{b:TextNodeInline}} TextNodeB */
/** @typedef {{i:TextNodeInline}} TextNodeI */
/** @typedef {{u:TextNodeInline}} TextNodeU */
/** @typedef {{s:TextNodeInline}} TextNodeS */
/** @typedef {{a:TextNodeInline, href:string}} TextNodeA */
/** @typedef {{weapon:TextNodeInline, code:string}} TextNodeWeapon */
/** @typedef {{artifact:TextNodeInline, code:string}} TextNodeArtifact */
/** @typedef {{item:TextNodeInline, code:string}} TextNodeItem */

/** @typedef {TextNodeB|TextNodeI|TextNodeU|TextNodeS|TextNodeA|TextNodeWeapon|TextNodeArtifact|TextNodeItem|string} TextNodeInline */

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
	if ('u' in node) return node.u
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
	return limitLinesWidth(textNodesToMarkdownInner(node), 80)
}
/**
 * @param {CompactTextParagraphs} node
 * @returns {string}
 */
function textNodesToMarkdownInner(node) {
	if (typeof node === 'string') return escapeMD(node).replace(/\n/g, '<br>\n')

	if (isParagraphArr(node)) return node.map(x => textNodesToMarkdownInner(x)).join('\n\n')
	if ('p' in node) return textNodesToMarkdownInner(node.p).trim()
	if (Array.isArray(node)) return node.map(x => textNodesToMarkdownInner(x)).join('')

	if ('b' in node) return '**' + textNodesToMarkdownInner(node.b) + '**'
	if ('i' in node) return '_' + textNodesToMarkdownInner(node.i) + '_'
	if ('u' in node) return '<u>' + textNodesToMarkdownInner(node.u) + '</u>'
	if ('s' in node) return '~~' + textNodesToMarkdownInner(node.s) + '~~'
	if ('a' in node) return `[${textNodesToMarkdownInner(node.a)}](${node.href})`
	if ('weapon' in node) return `[${textNodesToMarkdownInner(node.weapon)}](#weapon:${node.code})`
	if ('artifact' in node) return `[${textNodesToMarkdownInner(node.artifact)}](#artifact:${node.code})`
	if ('item' in node) return `[${textNodesToMarkdownInner(node.item)}](#item:${node.code})`
	mustBeNever(node)
}

/** @param {string} text */
function escapeMD(text) {
	return text.replace(/([_*\[\]()~`|])/, '\\$1')
}