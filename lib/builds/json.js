import { getArtifactCodeFromName } from './artifacts.js'

/** @typedef {import('./artifacts').ArtifactInfo} ArtifactInfo */

/**
 * @typedef {{
 *   nameCol: number,
 *   ext: null | {oneCol:number} | {twoCol:number, fourCol:number}
 * }} ArtifactBlock
 */

/** @return {{artifacts: ArtifactInfo[]}} */
export function extractItemsInfo(jsonData) {
	const artifacts = /**@type {ArtifactInfo[]}*/ ([])
	const artsSheet = getJsonSheet(jsonData, 'artifacts')
	let curStars = /**@type {number|null}*/ (null)
	let artSetInfo = /**@type {ArtifactBlock|null}*/ (null)
	for (const { values: cells = [] } of artsSheet.data[0].rowData) {
		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i]
			const text = getText(cell)
			const m = text && text.trim().match(/^(\d)\s*⭐\s*artifact 1?\s*sets/i)
			if (m) {
				curStars = parseInt(m[1], 10)
				artSetInfo = null
			}
		}

		if (curStars) {
			let _col
			if ((_col = findCellIndex(cells, /^artifact\s+set$/)) !== -1) {
				if (_col !== -1) {
					artSetInfo = { nameCol: _col, ext: null }
					if ((_col = findCellIndex(cells, /^1 set bonuses$/)) !== -1)
						artSetInfo.ext = { oneCol: _col }
				}
			} else if (artSetInfo && !artSetInfo.ext) {
				artSetInfo.ext = {
					twoCol: mustFindCellIndex(cells, /^2\Dpieces$/),
					fourCol: mustFindCellIndex(cells, /^4\Dpieces$/),
				}
			} else if (artSetInfo?.ext && cells.length > artSetInfo.nameCol) {
				const name = getText(cells[artSetInfo.nameCol])
					.replace(/\s+/g, ' ')
					.trim()
					.toLocaleLowerCase()
				const sets =
					'oneCol' in artSetInfo.ext
						? { 1: extractText(cells[artSetInfo.ext.oneCol]) }
						: {
								2: extractText(cells[artSetInfo.ext.twoCol]),
								4: extractText(cells[artSetInfo.ext.fourCol]),
						  }
				if (name) {
					if ('1' in sets ? !sets[1] : !sets[2] || !sets[4])
						throw new Error(`empty bonus text for '${name}'`)
					const code = getArtifactCodeFromName(name)
					// console.log(name, code, sets)
					artifacts.push({ code, sets })
				}
			}
		}
	}

	return { artifacts }
}

/** @returns {string} */
function getText(cell) {
	return cell.userEnteredValue?.stringValue ?? ''
}

function extractText(cell) {
	if (!cell) return ''
	return getText(cell)
}

/**
 * @param {any} jsonData
 * @param {string} name
 */
function getJsonSheet(jsonData, name) {
	const sheet = jsonData.sheets.find(x => x.properties.title.trim().toLocaleLowerCase() === name)
	if (!sheet)
		throw new Error(
			`sheet '${name}' not found, available: ` +
				jsonData.sheets.map(x => x.properties.title.trim().toLocaleLowerCase()),
		)
	if (sheet.data.length > 1)
		console.warn(`WARN: sheet '${name}' has ${sheet.data.length} sheet(s), expected 1`)
	return sheet
}

/**
 * @param {any} cells
 * @param {string|RegExp} text
 */
function findCellIndex(cells, text) {
	for (let i = 0; i < cells.length; i++) {
		const cell = cells[i]
		const cellText = getText(cell).toLocaleLowerCase()
		if (cellText) {
			if (typeof text === 'string') {
				if (cellText.includes(text)) return i
			} else {
				if (text.test(cellText.trim())) return i
			}
		}
	}
	return -1
}
/**
 * @param {any} cells
 * @param {string|RegExp} text
 */
function mustFindCellIndex(cells, text) {
	const index = findCellIndex(cells, text)
	if (index !== -1) return index
	throw new Error(`can not find '${text}' in ` + cells.map(x => getText(x)).join(' '))
}
