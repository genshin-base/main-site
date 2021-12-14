import { promises as fs } from 'fs'
import { json_getSheet } from './json.js'
import { json_extractArtifactsInfo } from './artifacts.js'
import { json_processElementTable } from './characters.js'
import { GI_ELEMENT_CODES, GI_WEAPON_TYPE_CODES } from '../genshin.js'
import { json_extractWeaponsInfo } from './weapons.js'
import { json_processChangelogsTable } from './changelogs.js'

/** @typedef {import('../xml').Node} Node */
/** @typedef {import('../xml').NodeOrText} NodeOrText */

/** @typedef {import('../text_nodes').TextItem} TextItem */
/** @typedef {import('../text_nodes').TextTypedItem} TextTypedItem */

/** @typedef {Record<string,string>} Style */

/** @typedef {import('./artifacts').ArtifactInfo} ArtifactInfo */
/** @typedef {import('./weapons').WeaponInfo} WeaponInfo */

/**
 * @typedef {{
 *   elementMap: Record<string, import('./characters').CharacterBuildInfo[]>,
 *   artifacts: ArtifactInfo[],
 *   weapons: WeaponInfo[],
 *   changelogsTable: import('./changelogs').ChangelogsTable,
 * }} BuildInfo
 */

/** @type {Record<string,{to:string, default:string|null, valMap?:Record<string,string>}>} */
const STYLE_ATTR_MAP = {
	'fo:font-size': { to: 'font-size', default: null },
	'fo:font-weight': { to: 'font-weight', default: 'normal' },
	'fo:color': { to: 'color', default: '#000000' },
	'fo:font-style': { to: 'font-style', default: 'normal' },
	'style:text-underline-style': {
		to: 'text-decoration',
		default: 'none',
		valMap: { solid: 'underline' },
	},
	'style:text-line-through-type': {
		to: 'text-decoration',
		default: 'none',
		valMap: { single: 'line-through' },
	},
}
/** @type {Record<string,string|string[]>} */
const STYLE_IGNORE_MAP = {
	'fo:text-shadow': 'none',
	'style:font-name': ['Arial', 'Roboto', 'Roboto,Arial'],
	'style:font-name-complex': ['Arial', 'Roboto', 'Roboto,Arial'],
	'style:font-size-asian': '_any_',
	'style:font-size-complex': '_any_',
	'style:font-style-asian': ['italic', 'normal'],
	'style:font-style-complex': ['italic', 'normal'],
	'style:font-weight-asian': ['bold', 'normal'],
	'style:font-weight-complex': ['bold', 'normal'],
	'style:text-line-through-type': 'none',
	'style:text-outline': 'false',
	'style:text-position': '0% 100%',
	'style:text-underline-color': 'font-color',
	'style:text-underline-width': 'auto',
}
/**
 * @param {Map<string,Style>} alias2style
 * @param {Style} style
 */
function makeClassName(alias2style, style) {
	const keywords = []
	if (style['color'] === '#ffffff') keywords.push('white')
	if (style['font-weight'] === 'bold') keywords.push('bold')
	if (style['font-style'] === 'italic') keywords.push('italic')
	if (style['text-decoration'] === 'underline') keywords.push('underline')
	if (style['text-decoration'] === 'line-through') keywords.push('linethrough')
	if (style['font-size'] === '10pt') keywords.push('small')
	if (style['font-size'] === '11pt') keywords.push('med')
	if (style['font-size'] === '12pt') keywords.push('big')

	let i = 0
	while (true) {
		const alias = 'g-' + keywords.join('-') + (i === 0 ? '' : '-' + i)
		if (!alias2style.has(alias)) return alias
		i++
	}
}

/**
 * @param {string} jsonFPath
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {Promise<BuildInfo>}
 */
export async function extractBuilds(jsonFPath, fixes) {
	const jsonData = JSON.parse(await fs.readFile(jsonFPath, 'utf-8'))
	for (const sheet of jsonData.sheets)
		for (const fix of fixes.sheets)
			if (fix.title.test(sheet.properties.title.trim()))
				if (fix.fixFunc(sheet)) {
					fix._used = true
				}

	// const odsZip = new StreamZip.async({ file: odsFPath })
	// for (const [name] of Object.entries(await odsZip.entries())) {
	// 	// if (name.startsWith('Pictures/'))
	// 	if (name === 'content.xml') {
	// 		buildInfo = await processSpreadsheet(
	// 			await parseXmlStream(await odsZip.stream(name)),
	// 			jsonData,
	// 			artifacts,
	// 			weapons,
	// 			fixes,
	// 		)
	// 	}
	// }

	const { artifacts, weapons } = extractItemsInfo(jsonData, fixes)

	return await processSpreadsheets(jsonData, artifacts, weapons, fixes)
}

/**
 * @return {{artifacts: ArtifactInfo[], weapons: WeaponInfo[]}}
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 */
function extractItemsInfo(jsonData, fixes) {
	return {
		artifacts: json_extractArtifactsInfo(json_getSheet(jsonData, 'artifacts')),
		weapons: GI_WEAPON_TYPE_CODES.map(type =>
			json_extractWeaponsInfo(json_getSheet(jsonData, new RegExp(`^${type}s?$`, 'i')), type, fixes),
		).flat(),
	}
}

/**
 * @param {any} jsonData
 * @param {ArtifactInfo[]} artifacts
 * @param {WeaponInfo[]} weapons
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {Promise<BuildInfo>}
 */
async function processSpreadsheets(jsonData, artifacts, weapons, fixes) {
	const elementMap = /**@type {Record<string,import('./characters').CharacterBuildInfo[]>}*/ ({})
	for (const code of GI_ELEMENT_CODES)
		if (code !== 'dendro')
			elementMap[code] = json_processElementTable(
				json_getSheet(jsonData, code),
				artifacts,
				weapons,
				fixes,
			)

	let changelogsTable = json_processChangelogsTable(json_getSheet(jsonData, 'changelogs'), fixes)

	return {
		elementMap,
		artifacts,
		weapons,
		changelogsTable,
	}
}

/**
 * @param {TextTypedItem[]} accum
 * @param {TextItem[]} textRoots
 */
function addStyledTextItems(accum, textRoots) {
	for (let i = 0; i < textRoots.length; i++) {
		const root = textRoots[i]
		if (typeof root === 'string') continue
		if (root.class !== null) accum.push(root)
		addStyledTextItems(accum, root.children)
	}
}
/**
 * @param {Node} styleRoot
 * @param {TextTypedItem[]} textItems
 */
function processStyles(styleRoot, textItems) {
	const usedClasses = /**@type {Set<string>}*/ (new Set())
	for (const item of textItems) if (item.class !== null) usedClasses.add(item.class)

	const styleMap = /**@type {Map<string,Style>} */ (new Map())
	for (const styleNode of styleRoot.children) {
		if (typeof styleNode === 'string') continue

		const className = styleNode.attrs['style:name']
		if (!usedClasses.has(className)) continue

		const style = /**@type {Style}*/ ({})
		for (const child of styleNode.children) {
			if (typeof child === 'string') continue
			for (const attr in child.attrs) {
				const value = child.attrs[attr]

				const ignoreMap = STYLE_IGNORE_MAP[attr]
				if (ignoreMap) {
					if (typeof ignoreMap === 'string') {
						if (ignoreMap === '_any_' || ignoreMap === value) continue
					} else {
						if (ignoreMap.includes(value)) continue
					}
				}

				const attrMap = STYLE_ATTR_MAP[attr]
				if (attrMap) {
					if (value !== attrMap.default) {
						let val = value
						if (attrMap.valMap) {
							if (!(value in attrMap.valMap)) {
								console.warn(`WARN: style value not in valMap: ${attr}:${value}`)
								continue
							}
							val = attrMap.valMap[value]
						}
						if (attrMap.to in style)
							console.warn(
								'WARN: overwriting existing style' +
									` ${attrMap.to}: ${style[attrMap.to]} -> ${val}`,
							)
						style[attrMap.to] = val
					}
					continue
				}
				console.warn(`WARN: unexpected style: ${attr}:${value}`)
			}
		}
		styleMap.set(className, style)
		// console.log(style)
	}

	const key2alias = /**@type {Map<string,string>}*/ (new Map())
	const name2alias = /**@type {Map<string,string>}*/ (new Map())
	const alias2style = /**@type {Map<string,Style>}*/ (new Map())
	for (const [className, style] of styleMap.entries()) {
		const key = Object.entries(style)
			.map(([k, v]) => k + ':' + v)
			.sort()
			.join('')
		let alias = key2alias.get(key)
		if (alias === undefined) {
			alias = makeClassName(alias2style, style)
			key2alias.set(key, alias)
			alias2style.set(alias, style)
		}
		name2alias.set(className, alias)
	}

	for (const item of textItems) {
		if (item.class === null) continue
		const alias = name2alias.get(item.class)
		if (alias === undefined) throw new Error(`no alias for '${item.class}, this should not happen`)
		item.class = alias
	}

	const aliasedMap = Object.fromEntries(
		Array.from(alias2style.entries()).sort((a, b) => a[0].localeCompare(b[0])),
	)
	return aliasedMap
}

/**
 * @param {Node} node
 * @param  {...string} tagNames
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
/**
 * @param {NodeOrText} node
 * @returns {string}
 */
function getMultilineTextContent(node) {
	if (typeof node === 'string') return node
	return node.children.map(getMultilineTextContent).join('') + (node.tag === 'text:p' ? '\n' : '')
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
/**
 * @param {Node[]} cells
 * @param {(number|undefined)[]} rowSpans
 */
function updateRowSpans(cells, rowSpans) {
	for (let i = 0; i < rowSpans.length; i++) {
		const rowSpan = rowSpans[i]
		if (rowSpan !== undefined && rowSpan > 0) rowSpans[i] = rowSpan - 1
	}
	for (let i = 0; i < cells.length; i++) {
		const rowSpan = cells[i].attrs['table:number-rows-spanned']
		if (rowSpan) rowSpans[i] = parseInt(rowSpan) - 1
	}
}
/**
 * @param {Node} table
 */
function* getNormalizeTableRows(table) {
	const rowSpans = /**@type {(number|undefined)[]}*/ ([])

	for (const row of table.children) {
		if (typeof row === 'string' || row.tag !== 'table:table-row') continue

		const origCells = row.children.filter(
			/**@returns {x is Node}*/ x => typeof x !== 'string' && x.tag === 'table:table-cell',
		)
		const cells = withDummyCells(origCells, rowSpans)

		yield cells

		updateRowSpans(cells, rowSpans)
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

	const style = node.attrs['text:style-name'] ?? null

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
			kind: node.tag === 'text:span' ? 'span' : 'p',
			children: node.children.map(x => extractText(x, logElem)),
			class: style,
		}

	throw new Error('unexpected node ' + JSON.stringify(node) + ' in ' + JSON.stringify(logElem))
}
