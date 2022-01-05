/** @typedef {{p:OneOrMoreInlineTextNodes}} TextNodeP */

/** @typedef {{b:TextNodeInline}} TextNodeB */
/** @typedef {{i:TextNodeInline}} TextNodeI */
/** @typedef {{u:TextNodeInline}} TextNodeU */
/** @typedef {{s:TextNodeInline}} TextNodeS */
/** @typedef {{a:TextNodeInline, href:string}} TextNodeA */

/** @typedef {TextNodeB|TextNodeI|TextNodeU|TextNodeS|TextNodeA|string} TextNodeInline */

/** @typedef {TextNodeInline|TextNodeP} TextNode */

/** @typedef {TextNode|TextNode[]} OneOrMoreTextNodes */
/** @typedef {TextNodeInline|TextNodeInline[]} OneOrMoreInlineTextNodes */

/**
 * @param {OneOrMoreTextNodes|null} curBlock
 * @param {OneOrMoreTextNodes} newBlock
 * @returns {OneOrMoreTextNodes}
 */
export function appendTextAsStringOrP(curBlock, newBlock) {
	if (curBlock === null) return newBlock
	return concatParagraphs(curBlock, newBlock)
}

/**
 * @param {OneOrMoreTextNodes[]} items
 * @returns {TextNodeP[]}
 */
function concatParagraphs(...items) {
	const res = []
	for (const item of items) {
		assertSingleOrInlineArrOrParagraphArr(item)
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
 * @param {OneOrMoreTextNodes} node
 * @returns {node is TextNodeP[]}
 */
function isParagraphArr(node) {
	if (!Array.isArray(node)) return false
	return countParagraphs(node) === node.length
}
/**
 * @param {OneOrMoreTextNodes} nodes
 * @returns {asserts nodes is TextNode|TextNodeInline[]|TextNodeP[]}
 */
function assertSingleOrInlineArrOrParagraphArr(nodes) {
	if (!Array.isArray(nodes)) return
	const pCount = countParagraphs(nodes)
	if (pCount > 0 && pCount !== nodes.length)
		throw new Error(`wrong text: expected zero or all paragraphs in array, got: ` + JSON.stringify(nodes))
}

/**
 * @param {OneOrMoreInlineTextNodes} newNode
 * @param {OneOrMoreTextNodes} destNode
 * @returns {OneOrMoreTextNodes}
 */
export function prependTextIntoP(newNode, destNode) {
	assertSingleOrInlineArrOrParagraphArr(destNode)

	if (isParagraphArr(destNode)) return [{ p: concatInlines(newNode, destNode[0].p) }, ...destNode.slice(1)]

	if (typeof destNode !== 'string' && 'p' in destNode) return { p: concatInlines(newNode, destNode.p) }

	return concatInlines(newNode, destNode)
}

/**
 * @param {TextNode} node
 * @returns {OneOrMoreTextNodes}
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
 * @param {OneOrMoreTextNodes} nodes
 * @returns {number}
 */
export function getTextLength(nodes) {
	if (Array.isArray(nodes)) return nodes.map(getTextLength).reduce((a, b) => a + b)
	if (typeof nodes === 'string') return nodes.length
	return getTextLength(getTextNodeChildren(nodes))
}

/**
 * @param {import('./text').OneOrMoreTextNodes} node
 * @returns {boolean}
 */
export function isTextBlank(node) {
	if (typeof node === 'string') return node === ''
	if (Array.isArray(node)) return node.length === 0 || (node.length === 1 && isTextBlank(node[0]))
	return isTextBlank(getTextNodeChildren(node))
}
