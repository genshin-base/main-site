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
			onclosetag(tag, isImplied) {
				stack.pop()
				curNode = stack[stack.length - 1]
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
 * @param {(node:NodeOrText, parents:Node[]) => boolean|'skip-children'} func
 * @param {Node[]} [ancestors]
 * @returns {{node:NodeOrText, ancestors:Node[]}|null}
 */
export function searchNode(root, func, ancestors) {
	ancestors ??= []

	const res = func(root, ancestors)
	if (res === true) return { node: root, ancestors }
	if (res === 'skip-children') return null

	if (!isNode(root)) return null

	ancestors.push(root)
	for (const child of root.children) {
		const found = searchNode(child, func, ancestors)
		if (found) return found
	}
	ancestors.pop()
	return null
}

/**
 * @param {NodeOrText} root
 * @param {(node:Node, parents:Node[]) => boolean|'skip-children'} func
 * @returns {{node:NodeOrText, ancestors:Node[]}|null}
 */
export function searchNodeNodes(root, func) {
	return searchNode(root, (node, ancs) => (isNode(node) ? func(node, ancs) : false))
}

/**
 * @param {NodeOrText} root
 * @param {string} cls
 * @param {(node:Node, parents:Node[]) => boolean|'skip-children'} func
 * @returns {{node:NodeOrText, ancestors:Node[]}|null}
 */
export function searchNodeWithClass(root, cls, func) {
	return searchNode(root, (node, ancs) =>
		isNode(node) && nodeHasClass(node, cls) ? func(node, ancs) : false,
	)
}

/**
 * @param {NodeOrText} root
 * @param {string} tag
 * @param {(node:Node, parents:Node[]) => boolean|'skip-children'} func
 * @returns {{node:NodeOrText, ancestors:Node[]}|null}
 */
export function searchNodeWithTag(root, tag, func) {
	return searchNode(root, (node, ancs) => (isNode(node) && node.tag === tag ? func(node, ancs) : false))
}

/**
 * @template {NodeOrText} T
 * @param {NodeOrText} root
 * @param {(node:NodeOrText, ancestors:Node[]) => node is T} predicate
 * @param {boolean} [descendIntoFound]
 * @returns {T[]}
 */
export function findNodes(root, predicate, descendIntoFound) {
	const nodes = /**@type {T[]}*/ ([])
	searchNode(root, (node, ancestors) => {
		if (predicate(node, ancestors)) {
			nodes.push(node)
			if (!descendIntoFound) return 'skip-children'
		}
		return false
	})
	return nodes
}

/**
 * @param {NodeOrText} root
 * @param {string} cls
 * @returns {Node|null}
 */
export function findNodeByClass(root, cls) {
	const foundNode = searchNode(root, x => isNode(x) && nodeHasClass(x, cls))
	return foundNode && mustBeNode(foundNode.node)
}
/**
 * @param {NodeOrText} root
 * @param {string} cls
 * @returns {Node}
 */
export function mustFindNodeByClass(root, cls) {
	const node = findNodeByClass(root, cls)
	if (!node) throw new Error(`can not find element with class '${cls}'`)
	return node
}

/**
 * @param {NodeOrText} root
 * @param {string|null} tag
 * @param {string|null} cls
 * @param {string} attr
 * @param {RegExp} re
 * @returns {RegExpMatchArray|null}
 */
export function findNodeAttrMatch(root, tag, cls, attr, re) {
	let m = null
	searchNode(root, x => {
		if (
			isNode(x) &&
			(tag === null || x.tag === tag) &&
			(cls === null || nodeHasClass(x, cls)) &&
			attr in x.attrs
		) {
			m = x.attrs[attr].match(re)
			if (m) return true
		}
		return !!m
	})
	return m
}
/**
 * @param {NodeOrText} root
 * @param {string|null} tag
 * @param {string|null} cls
 * @param {string} attr
 * @param {RegExp} re
 * @returns {RegExpMatchArray}
 */
export function mustFindNodeAttrMatch(root, tag, cls, attr, re) {
	const m = findNodeAttrMatch(root, tag, cls, attr, re)
	if (!m)
		throw new Error(
			`can not find ` +
				(tag === null ? 'element' : `<${tag}>`) +
				` with ` +
				(cls === null ? '' : `class '${cls}' and `) +
				`${attr} matching ` +
				re,
		)
	return m
}

/**
 * @param {NodeOrText} root
 * @param {RegExp} re
 * @returns {RegExpMatchArray|null}
 */
export function findNodeHrefMatch(root, re) {
	return findNodeAttrMatch(root, 'a', null, 'href', re)
}
/**
 * @param {NodeOrText} root
 * @param {RegExp} re
 * @returns {RegExpMatchArray}
 */
export function mustFindNodeHrefMatch(root, re) {
	return mustFindNodeAttrMatch(root, 'a', null, 'href', re)
}

/**
 * @param {Node} node
 * @param {string} cls
 */
export function nodeHasClass(node, cls) {
	if (!('class' in node.attrs)) return false
	const className = node.attrs.class
	let index = 0
	while (true) {
		index = className.indexOf(cls, index)
		if (index === -1) return false
		const endIndex = index + cls.length
		const startIsOk = index === 0 || className[index - 1] === ' '
		const endIsOk = endIndex === className.length || className[endIndex] === ' '
		if (startIsOk && endIsOk) return true
		index = endIndex
	}
}
