import { default as StreamZip } from 'node-stream-zip'
import { parseXmlStream } from './xml.js'

/** @typedef {import('./xml').Node} Node */
/** @typedef {import('./xml').NodeOrText} NodeOrText */

/** @typedef {{kind:'p',    children:TextItem[], class:string|null}} TextP */
/** @typedef {{kind:'span', children:TextItem[], class:string|null}} TextSpan */
/** @typedef {{kind:'a',    children:TextItem[], class:string|null, href:string|null}} TextA */
/** @typedef {TextP|TextA|TextSpan|string} TextItem */

/**
 * @typedef {{
 *   name:string
 *   roles:{
 *     name:string,
 *     isBest:boolean,
 *     weapon:TextItem[],
 *     artifact:TextItem[],
 *     mainStats:TextItem[],
 *     subStats:TextItem[],
 *     talent:TextItem[],
 *     tips:TextItem[],
 *   }[],
 *   notes:TextItem[],
 * }} CharacterBuildInfo
 */

/**
 * @typedef {{
 *   buildInfo: CharacterBuildInfo,
 *   roleCol: number,
 *   talentCol: number,
 *   tipsCol: number,
 *   ext: {
 *     weaponCol:number,
 *     artifactCol:number,
 *     mainStatsCol:number,
 *     subStatsCol:number
 *   }|null,
 * }} CharacterBlock
 */

/** @typedef {{elementMap: Record<string, CharacterBuildInfo[]>}} BuildInfo */

const ELEMENT_NAMES = new Set('pyro electro hydro cryo anemo geo'.split(' '))

/**
 * @param {string} fpath
 * @returns {Promise<BuildInfo>}
 */
export async function extractBuildsFromODS(fpath) {
	let buildInfo = /**@type {BuildInfo|null}*/ (null)

	const picturesMap = {}
	const zip = new StreamZip.async({ file: fpath })
	for (const [name, entry] of Object.entries(await zip.entries())) {
		if (name.startsWith('Pictures/')) picturesMap[name.slice('Pictures/'.length)] = entry
		if (name === 'content.xml') {
			buildInfo = await processSpreadsheet(await parseXmlStream(await zip.stream(name)))
		}
	}
	await zip.close()

	if (!buildInfo) throw new Error('spreadsheet content is missing')
	return buildInfo
}

/**
 * @param {Node} root
 * @returns {Promise<BuildInfo>}
 */
async function processSpreadsheet(root) {
	const content = getChild(root, 'office:document-content')

	const styleMap = {}
	const styleRoot = getChild(content, 'office:automatic-styles')
	for (const style of styleRoot.children)
		if (typeof style !== 'string') styleMap[style.attrs['style:name']] = style

	const elementMap = /**@type {Record<string,CharacterBuildInfo[]>}*/ ({})
	const spreadsheet = getChild(content, 'office:body', 'office:spreadsheet')
	for (const table of spreadsheet.children) {
		if (typeof table === 'string' || table.tag !== 'table:table') continue

		const tableName = table.attrs['table:name'].trim().toLocaleLowerCase()

		if (ELEMENT_NAMES.has(tableName)) elementMap[tableName] = processElementTable(table)
	}

	return {
		elementMap,
	}
}

/**
 * @param {Node} table
 */
function processElementTable(table) {
	const rowSpans = /**@type {(number|undefined)[]}*/ ([])

	const characters = /**@type {CharacterBuildInfo[]}*/ ([])
	let colOffset = 0
	let charBlock = /**@type {CharacterBlock|null}*/ (null)
	function applyCharBlockUnlessEmpty() {
		if (charBlock !== null) characters.push(charBlock.buildInfo)
		charBlock = null
	}

	for (const row of table.children) {
		if (typeof row === 'string' || row.tag !== 'table:table-row') continue

		const origCells = row.children.filter(
			/**@returns {x is Node}*/ x => typeof x !== 'string' && x.tag === 'table:table-cell',
		)
		const cells = withDummyCells(origCells, rowSpans)

		for (const cell of cells) {
			if (/^(?:4|5) star$/i.test(getTextContent(cell).trim())) {
				colOffset = parseInt(cell.attrs['table:number-rows-spanned'])
				break
			}
		}

		if (nodesInclude(cells, /^(?:artifact stats|stats priority)$/)) {
			applyCharBlockUnlessEmpty()
			const name = getTextContent(cells[colOffset]).trim().toLocaleLowerCase()
			charBlock = {
				buildInfo: {
					name,
					roles: [],
					notes: [],
				},
				roleCol: name === 'barbara' ? colOffset + 1 : mustFindCellIndex(cells, 'role'), //FIX
				talentCol: mustFindCellIndex(cells, 'talent priority'),
				tipsCol: mustFindCellIndex(cells, /ability tips?/),
				ext: null,
			}
			// if (charBlock.name === 'AMBER') console.log(cells, origCells)
		} else if (charBlock && !charBlock.ext && nodesInclude(cells, /^main stats?$/)) {
			charBlock.ext = {
				weaponCol: mustFindCellIndex(cells, 'weapon'),
				artifactCol: mustFindCellIndex(cells, 'artifact'),
				mainStatsCol: mustFindCellIndex(cells, /main stats?/),
				subStatsCol: mustFindCellIndex(cells, /sub ?stats?/),
			}
		} else if (charBlock?.ext && charBlock.tipsCol < cells.length) {
			const firstCellText = getTextContent(cells[colOffset]).trim()
			if (firstCellText && firstCellText.toLocaleLowerCase().startsWith('notes')) {
				charBlock.buildInfo.notes = extractChildrenText(cells[colOffset + 1])
				applyCharBlockUnlessEmpty()
			} else {
				const roleName = getTextContent(cells[charBlock.roleCol]).trim()
				if (roleName !== '')
					charBlock.buildInfo.roles.push({
						name: roleName.replace('⭐', '').trim().toLocaleLowerCase(),
						isBest: roleName.includes('⭐'),
						weapon: extractChildrenText(cells[charBlock.ext.weaponCol]),
						artifact: extractChildrenText(cells[charBlock.ext.artifactCol]),
						mainStats: extractChildrenText(cells[charBlock.ext.mainStatsCol]),
						subStats: extractChildrenText(cells[charBlock.ext.subStatsCol]),
						talent: extractChildrenText(cells[charBlock.talentCol]),
						tips: extractChildrenText(cells[charBlock.tipsCol]),
					})
				// if (charBlock.name === 'AMBER') console.log(cells[charBlock.ext.weaponCol], weapon)
			}
			// if (charBlock.name === 'AMBER') console.log(charBlock)
		}

		updateRowSpans(cells, rowSpans)
	}

	return characters
}

/**
 * @param {Node} node
 * @param  {...string} tagNames
 * @returns
 */
function getChild(node, ...tagNames) {
	for (const tag of tagNames) {
		let found = false
		for (let i = 0; i < node.children.length; i++) {
			const child = node.children[i]
			if (typeof child !== 'string' && child.tag === tag) {
				node = child
				found = true
				break
			}
		}
		if (!found)
			throw new Error(
				`elem '${tag}' not found, available: ` +
					node.children.map(x => (typeof x === 'string' ? '' : x.tag)).join(', '),
			)
	}
	return node
}

/**
 * @param {NodeOrText[]} nodes
 * @param {string|RegExp} text
 */
function findNodeIndex(nodes, text) {
	for (let i = 0; i < nodes.length; i++) {
		const cell = nodes[i]
		if (typeof cell === 'string') {
			if (typeof text === 'string') {
				if (cell.toLocaleLowerCase().includes(text)) return i
			} else {
				if (text.test(cell.toLocaleLowerCase())) return i
			}
		} else {
			if (findNodeIndex(cell.children, text) !== -1) return i
		}
	}
	return -1
}
/**
 * @param {NodeOrText[]} nodes
 * @param {string|RegExp} text
 */
function mustFindCellIndex(nodes, text) {
	const index = findNodeIndex(nodes, text)
	if (index === -1)
		throw new Error(`can not find '${text}' in ` + nodes.map(x => getTextContent(x)).join(' '))
	return index
}
/**
 * @param {NodeOrText[]} nodes
 * @param {string|RegExp} text
 */
function nodesInclude(nodes, text) {
	return findNodeIndex(nodes, text) !== -1
}

/**
 * @param {NodeOrText} node
 * @returns {string}
 */
function getTextContent(node) {
	if (typeof node === 'string') return node
	return node.children.map(getTextContent).join(' ')
}

const DUMMY_NODE = /**@type {Node}*/ ({ tag: '', attrs: {}, children: [] })
/**
 * @param {Node[]} cells
 * @param {(number|undefined)[]} rowSpans
 */
function withDummyCells(cells, rowSpans) {
	cells = cells.slice()
	for (let i = 0; i < cells.length; i++) {
		const colSpan = parseInt(cells[i].attrs['table:number-columns-spanned'])
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

function updateRowSpans(cells, rowSpans) {
	for (let i = 0; i < rowSpans.length; i++) {
		if (rowSpans[i] !== undefined && rowSpans[i] > 0) rowSpans[i]--
	}
	for (let i = 0; i < cells.length; i++) {
		const rowSpan = cells[i].attrs['table:number-rows-spanned']
		if (rowSpan) rowSpans[i] = parseInt(rowSpan) - 1
	}
}

/**
 * @param {Node} node
 * @returns {TextItem[]}
 */
function extractChildrenText(node) {
	return node.children.map(x => extractText(x, x))
}
/**
 * @param {NodeOrText} node
 * @param {NodeOrText|null} [logElem]
 * @returns {TextItem}
 */
function extractText(node, logElem = null) {
	logElem ??= node

	if (typeof node === 'string') return node

	const style = node.attrs['table:style-name'] ?? null

	if (node.tag === 'text:s') return ' '.repeat(parseInt(node['text:c'] ?? '1'))

	if (node.tag === 'text:a')
		return {
			kind: 'a',
			children: node.children.map(x => extractText(x, logElem)),
			class: style,
			href: node.attrs['xlink:href'],
		}

	if (node.tag === 'text:span' || node.tag === 'text:p')
		return {
			kind: 'span',
			children: node.children.map(x => extractText(x, logElem)),
			class: style,
		}

	throw new Error('unexpected node ' + JSON.stringify(node) + ' in ' + JSON.stringify(logElem))
}
