import { Parser } from 'htmlparser2'
import { WritableStream as XMLWritableStream } from 'htmlparser2/lib/WritableStream'

/** @typedef {{tag:string, attrs:Record<string,string>, children:NodeOrText[]}} Node */
/** @typedef {Node|string} NodeOrText */

/**
 * @param {NodeJS.ReadableStream} stream
 * @returns {Promise<Node>}
 */
export async function parseXmlStream(stream) {
	const { handler, root } = makeParsingHandler()
	const parserStream = new XMLWritableStream(handler, { xmlMode: false })
	await new Promise((resolve, reject) =>
		stream.pipe(parserStream).on('finish', resolve).on('error', reject),
	)
	return root
}

/**
 * @param {string} str
 * @returns {Node}
 */
export function parseXmlString(str) {
	const { handler, root } = makeParsingHandler()
	const parser = new Parser(handler, { xmlMode: false })
	parser.write(str)
	parser.end()
	return root
}

function makeParsingHandler() {
	const root = /**@type {Node}*/ ({ tag: '', attrs: {}, children: [] })
	let curNode = root
	const stack = /**@type {Node[]}*/ ([curNode])

	/** @type {Partial<import('htmlparser2/lib/Parser').Handler>} */
	const handler = {
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
	}
	return { handler, root }
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
	if (node.tag === 'style') return ''
	return node.children.map(getTextContent).join(' ')
}
/**
 * @param {NodeOrText} node
 * @returns {string}
 */
export function getMultilineTextContent(node) {
	if (typeof node === 'string') return node.replaceAll('\n', ' ')
	return (node.tag === 'br' ? '\n' : '') + node.children.map(getMultilineTextContent).join(' ')
}

/**
 * @param {NodeOrText} root
 * @param {string} selectors
 * @returns {Generator<Node, void, unknown>}
 */
export function* queryNodes(root, selectors) {
	if (typeof root === 'string') return
	// const items = selectors.trim().split(/([.#:]?\w+)/)
	const items = selectors.split(/(?:\s*([>\s])\s*)/)
	const foundNodes = /**@type {Set<Node>}*/ (new Set())
	yield* queryNodesInner(root, true, items, -1, foundNodes)
}
/**
 * @param {NodeOrText} root
 * @param {boolean} matchRoot
 * @param {string[]} selectors
 * @param {number} fromIndex
 * @param {Set<Node>} foundNodes
 * @returns {Generator<Node, void, unknown>}
 */
function* queryNodesInner(root, matchRoot, selectors, fromIndex, foundNodes) {
	if (typeof root === 'string') return
	if (fromIndex >= selectors.length - 1) {
		if (!foundNodes.has(root)) {
			foundNodes.add(root)
			yield root
		}
		return
	}

	const combinator = fromIndex < 0 ? ' ' : selectors[fromIndex]
	const selector = selectors[fromIndex + 1]
	const selectorItems = selector.match(/([.#:]?\w+)/g) ?? []

	if (matchRoot && nodeMatches(root, selectorItems)) {
		yield* queryNodesInner(root, false, selectors, fromIndex + 2, foundNodes)
	}

	if (combinator === ' ') {
		for (const child of searchMatchingDescendants(root, selectorItems))
			yield* queryNodesInner(child, false, selectors, fromIndex + 2, foundNodes)
	} else if (combinator === '>') {
		for (const child of searchMatchingChildren(root, selectorItems))
			yield* queryNodesInner(child, false, selectors, fromIndex + 2, foundNodes)
	} else {
		throw new Error(`invalid combinator '${combinator}'`)
	}
}
/**
 * @param {Node} root
 * @param {string[]} selectorItems
 */
function* searchMatchingDescendants(root, selectorItems) {
	for (const child of root.children) {
		if (typeof child === 'string') continue
		if (nodeMatches(child, selectorItems)) yield child
		yield* searchMatchingDescendants(child, selectorItems)
	}
}
/**
 * @param {Node} root
 * @param {string[]} selectorItems
 */
function* searchMatchingChildren(root, selectorItems) {
	for (const child of root.children) {
		if (typeof child === 'string') continue
		if (nodeMatches(child, selectorItems)) yield child
	}
}
/**
 * @param {Node} node
 * @param {string[]} selectorItems
 */
function nodeMatches(node, selectorItems) {
	for (let i = 0; i < selectorItems.length; i++) {
		const item = selectorItems[i]
		if (item[0] === '.') {
			if (!nodeHasClass(node, item.slice(1))) return false
		} else if (item[0] === '#') {
			if (node.attrs.id !== item.slice(1)) return false
		} else {
			if (node.tag !== item) return false
		}
	}
	return true
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
 * @returns {{node:Node, ancestors:Node[]}|null}
 */
export function searchNodeNodes(root, func) {
	return /** @type {{node:Node, ancestors:Node[]}|null} */ (
		searchNode(root, (node, ancs) => (isNode(node) ? func(node, ancs) : false))
	)
}

/**
 * @param {NodeOrText} root
 * @param {string} cls
 * @param {(node:Node, parents:Node[]) => boolean|'skip-children'} func
 * @returns {{node:Node, ancestors:Node[]}|null}
 */
export function searchNodeWithClass(root, cls, func) {
	const res = searchNode(root, (node, ancs) =>
		isNode(node) && nodeHasClass(node, cls) ? func(node, ancs) : false,
	)
	return /**@type {{node:Node, ancestors:Node[]}|null}*/ (res)
}

/**
 * @param {NodeOrText} root
 * @param {string} tag
 * @param {(node:Node, parents:Node[]) => boolean|'skip-children'} func
 * @returns {{node:Node, ancestors:Node[]}|null}
 */
export function searchNodeWithTag(root, tag, func) {
	const res = searchNode(root, (node, ancs) =>
		isNode(node) && node.tag === tag ? func(node, ancs) : false,
	)
	return /**@type {{node:Node, ancestors:Node[]}|null}*/ (res)
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
 * @param {string} tag
 * @returns {Node|null}
 */
export function findNodeWithTag(root, tag) {
	const foundNode = searchNode(root, x => isNode(x) && x.tag === tag)
	return foundNode && mustBeNode(foundNode.node)
}
/**
 * @param {NodeOrText} root
 * @param {string} tag
 * @returns {Node}
 */
export function mustFindNodeWithTag(root, tag) {
	const node = findNodeWithTag(root, tag)
	if (!node) throw new Error(`can not find element <${tag}>`)
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

/**
 * @param {import('#lib/xml').NodeOrText[]} cells
 * @param {RegExp} re
 */
export function mustFindCellIndex(cells, re) {
	let index = 0
	for (const cell of cells) {
		if (isNode(cell)) {
			if (re.test(getTextContent(cell).trim())) return index
			index++
		}
	}
	throw new Error(`can not find column '${re}'`)
}

/**
 * @param {Node} tbodyNode
 * @param {(row:Node, cells:Node[], rowIndex:number) => unknown} rowFunc
 */
export function forEachTBodyRow(tbodyNode, rowFunc) {
	let rowIndex = 0
	const rowSpans = /**@type {(number|undefined)[]}*/ ([])
	for (let i = 0; i < tbodyNode.children.length; i++) {
		const row = tbodyNode.children[i]
		if (!isNode(row)) continue

		const origCells = row.children.filter(isNode)
		const cells = withDummyCells(origCells, rowSpans)

		rowFunc(row, cells, rowIndex)

		updateRowSpans(cells, rowSpans)

		rowIndex++
	}
}
export const DUMMY_NODE = /**@type {import('#lib/xml').Node}*/ ({ tag: '', attrs: {}, children: [] })
/**
 * @param {import('#lib/xml').Node[]} cells
 * @param {(number|undefined)[]} rowSpans
 */
function withDummyCells(cells, rowSpans) {
	cells = cells.slice()
	for (let i = 0; i < cells.length; i++) {
		const colSpan = parseInt(cells[i].attrs['colspan'])
		if (!isNaN(colSpan))
			for (let j = 0; j < colSpan - 1; j++) {
				cells.splice(++i, 0, DUMMY_NODE)
			}
	}
	for (let i = 0; i < rowSpans.length; i++) {
		const rowSpan = rowSpans[i]
		if (rowSpan !== undefined && rowSpan > 0) {
			cells.splice(i, 0, DUMMY_NODE)
		}
	}
	return cells
}
/**
 * @param {import('#lib/xml').Node[]} cells
 * @param {(number|undefined)[]} rowSpans
 */
function updateRowSpans(cells, rowSpans) {
	for (let i = 0; i < rowSpans.length; i++) {
		const rowSpan = rowSpans[i]
		if (rowSpan !== undefined && rowSpan > 0) rowSpans[i] = rowSpan - 1
	}
	for (let i = 0; i < cells.length; i++) {
		const rowSpan = cells[i].attrs['rowspan']
		if (rowSpan) rowSpans[i] = parseInt(rowSpan) - 1
	}
}
