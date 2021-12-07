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
				if (typeof prevChild === 'string') curNode.children[lastI] = prevChild + text
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
