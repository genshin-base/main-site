/** @typedef {{p:OneOrMoreInlineTextNodes}} TextNodeP */

/** @typedef {{b:TextNodeInline}} TextNodeB */
/** @typedef {{i:TextNodeInline}} TextNodeI */
/** @typedef {{u:TextNodeInline}} TextNodeU */
/** @typedef {{s:TextNodeInline}} TextNodeS */
/** @typedef {{a:TextNodeInline, href:string}} TextNodeA */

/** @typedef {TextNodeB|TextNodeI|TextNodeU|TextNodeS|TextNodeA|string} TextNodeInline */

/** @typedef {TextNodeInline|TextNodeP} TextNode */

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
 * @param {TextNode} node
 * @returns {CompactTextParagraphs}
 */
export function getTextNodeChildren(node) {
	if (typeof node === 'string') return node
	if ('p' in node) return node.p
	if ('b' in node) return node.b
	if ('i' in node) return node.i
	if ('u' in node) return node.u
	if ('s' in node) return node.s
	if ('a' in node) return node.a
	throw new Error('should not be reachable')
}

/**
 * @param {CompactTextParagraphs} nodes
 * @returns {number}
 */
export function getTextLength(nodes) {
	if (Array.isArray(nodes)) return nodes.map(getTextLength).reduce((a, b) => a + b)
	if (typeof nodes === 'string') return nodes.length
	return getTextLength(getTextNodeChildren(nodes))
}

/**
 * @param {import('./text').CompactTextParagraphs} node
 * @returns {boolean}
 */
export function isTextBlank(node) {
	if (typeof node === 'string') return node === ''
	if (Array.isArray(node)) return node.length === 0 || (node.length === 1 && isTextBlank(node[0]))
	return isTextBlank(getTextNodeChildren(node))
}
