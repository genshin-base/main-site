import { WritableStream as XMLWritableStream } from 'htmlparser2/lib/WritableStream.js'

/** @typedef {{tag:string, attrs:Record<string,string>, children:NodeOrText[]}} Node */
/** @typedef {Node|string} NodeOrText */

/**
 * @param {NodeJS.ReadableStream} stream
 * @returns {Promise<Node>}
 */
export async function parseXmlStream(stream) {
	const root = /**@type {Node}*/ ({ tag: '', attrs: {}, children: [] })
	let curNode = root
	const stack = /**@type {Node[]}*/ ([curNode])

	const parserStream = new XMLWritableStream(
		{
			onopentag(tag, attrs) {
				const newNode = { tag, attrs, children: [] }
				curNode.children.push(newNode)
				curNode = newNode
				stack.push(curNode)
			},
			ontext(text) {
				const lastI = curNode.children.length - 1
				const prevChild = curNode.children[lastI]
				if (!isNode(prevChild)) curNode.children[lastI] = prevChild + text
				else curNode.children.push(text)
			},
			onclosetag(tagname) {
				curNode = stack[stack.length - 2]
				stack.pop()
			},
		},
		{ xmlMode: true },
	)

	await new Promise((resolve, reject) =>
		stream.pipe(parserStream).on('finish', resolve).on('error', reject),
	)
	return root
}

/**
 * @param {NodeOrText} node
 * @returns {node is Node}
 */
export function isNode(node) {
	return typeof node !== 'string'
}

/**
 * @param {NodeOrText} node
 * @returns {Node}
 */
export function mustBeNode(node) {
	if (!isNode(node)) throw new Error('expected node, got text')
	return node
}

/**
 * @param {NodeOrText} node
 * @returns {string}
 */
export function getTextContent(node) {
	if (typeof node === 'string') return node
	return node.children.map(getTextContent).join(' ')
}

/**
 * @param {NodeOrText} root
 * @param {(node:NodeOrText, parents:Node[]) => boolean} func
 * @param {Node[]} [ancestors]
 * @returns {{node:NodeOrText, ancestors:Node[]}|null}
 */
export function searchNode(root, func, ancestors) {
	ancestors ??= []
	if (func(root, ancestors)) return { node: root, ancestors }

	if (!isNode(root)) return null

	ancestors.push(root)
	for (const child of root.children) {
		const found = searchNode(child, func, ancestors)
		if (found) return found
	}
	ancestors.pop()
	return null
}
