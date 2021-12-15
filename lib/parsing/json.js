/** @typedef {{p:TextNodeInline|TextNodeInline[]}} TextNodeP */

/** @typedef {{b:TextNodeInline}} TextNodeB */
/** @typedef {{i:TextNodeInline}} TextNodeI */
/** @typedef {{u:TextNodeInline}} TextNodeU */
/** @typedef {{s:TextNodeInline}} TextNodeS */
/** @typedef {{a:TextNodeInline, href:string}} TextNodeA */

/** @typedef {TextNodeB|TextNodeI|TextNodeU|TextNodeS|TextNodeA|string} TextNodeInline */

/** @typedef {TextNodeInline|TextNodeP} TextNode */

/** @typedef {TextNode|TextNode[]} OneOrMoreTextNodes */

const TEXT_FORMAT_USED_ATTRS = new Set(['link', 'bold', 'italic', 'underline', 'strikethrough'])

/**
 * @param {import('../google').CellData|undefined} cell
 * @returns {string}
 */
export function json_getText(cell) {
	return cell?.userEnteredValue?.['stringValue'] ?? ''
}

/**
 * @param {import('../google').CellData|undefined} cell
 * @returns {string[]}
 */
export function json_getTextLines(cell) {
	return json_getText(cell).trim().split(/\n+/)
}

/**
 * @param {import('../google').CellData|undefined} cell
 * @returns {OneOrMoreTextNodes}
 */
export function json_extractText(cell) {
	if (!cell) return []
	const text = /**@type {string}*/ (cell.userEnteredValue?.['stringValue'] ?? '')
	if (!text) return []

	const defaultFormat = cell.userEnteredFormat?.textFormat ?? {}
	const formatRuns = json_optimizeFormatRuns(cell.textFormatRuns ?? [])

	const paragraphs = /**@type {TextNodeP[]}*/ ([])
	const pTexts = text.split(/(\n[\n\s]*\n+)/)
	for (let i = 0, textOffset = 0; i < pTexts.length; i += 2) {
		const pText = pTexts[i]
		const sep = pTexts[i + 1] ?? ''
		const pFormatRuns = json_sliceFormatRuns(formatRuns, textOffset, pText.length)

		let children
		if (pFormatRuns.length > 0) {
			/**@type {TextNodeInline[]}*/
			children = pFormatRuns.map((run, i, formatRuns) => {
				const format = Object.assign({}, defaultFormat, run.format)
				const nextIndex =
					i < formatRuns.length - 1 ? formatRuns[i + 1].startIndex : textOffset + pText.length
				const href = format.link?.uri

				let node = /**@type {TextNodeInline}*/ (text.slice(run.startIndex ?? 0, nextIndex))
				if (format.bold) node = { b: node }
				if (format.italic) node = { i: node }
				if (format.underline && !href) node = { u: node }
				if (format.strikethrough) node = { s: node }
				if (href) node = { a: node, href }
				return node
			})
		} else {
			children = pText
		}
		paragraphs.push({ p: children.length === 1 ? children[0] : children })

		textOffset += pText.length + sep.length
	}
	return paragraphs.length === 1 ? paragraphs[0].p : paragraphs
}

/**
 * @param {import('../google').TextFormatRun[]} runs
 * @param {number} start
 * @param {number} len
 */
function json_sliceFormatRuns(runs, start, len) {
	const res = []
	const end = start + len
	for (let i = 0; i < runs.length; i++) {
		const run = runs[i]
		const next = i < runs.length - 1 ? runs[i + 1] : null
		const startIndex = run.startIndex ?? 0
		if (startIndex < start) {
			if (next) {
				if ((next.startIndex ?? 0) > start) res.push({ startIndex: start, format: run.format })
			} else {
				res.push({ startIndex: start, format: run.format })
			}
		} else if (startIndex < end) {
			res.push(run)
		}
	}
	return res
}

/**
 * @param {import('../google').TextFormatRun[]} runs
 */
function json_optimizeFormatRuns(runs) {
	const res = []
	for (const run of runs) {
		const prev = res.length > 0 ? res[res.length - 1] : null
		if (!prev || !json_textFormatsAreEqual(prev.format, run.format)) res.push(run)
	}
	return res
}

/**
 * @param {import('../google').TextFormat} a
 * @param {import('../google').TextFormat} b
 */
function json_textFormatsAreEqual(a, b) {
	let aCount = 0
	let bCount = 0
	for (const attr in a) if (TEXT_FORMAT_USED_ATTRS.has(attr)) aCount++
	for (const attr in b) if (TEXT_FORMAT_USED_ATTRS.has(attr)) bCount++
	if (aCount !== bCount) return false

	for (const attr in a)
		if (TEXT_FORMAT_USED_ATTRS.has(attr)) {
			if (attr === 'link') {
				if (a.link?.uri !== b.link?.uri) return false
			} else {
				if (a[attr] !== b[attr]) return false
			}
		}
	return true
}

/**
 * @param {import('../google').Spreadsheet} spreadsheet
 * @param {string|RegExp} name
 * @returns {import('../google').Sheet}
 */
export function json_getSheet(spreadsheet, name) {
	const sheet = spreadsheet.sheets.find(x =>
		typeof name === 'string'
			? x.properties.title.trim().toLocaleLowerCase() === name
			: name.test(x.properties.title.trim()),
	)
	if (!sheet)
		throw new Error(
			`sheet '${name}' not found, available: ` + spreadsheet.sheets.map(x => x.properties.title.trim()),
		)
	if (sheet.data.length > 1)
		console.warn(`WARN: sheet '${name}' has ${sheet.data.length} sheet(s), expected 1`)
	return sheet
}

/**
 * @param {import('../google').CellData[]} cells
 * @param {string|RegExp} text
 */
export function json_findCellIndex(cells, text) {
	for (let i = 0; i < cells.length; i++) {
		const cell = cells[i]
		const cellText = json_getText(cell).toLocaleLowerCase()
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
 * @param {import('../google').CellData[]} cells
 * @param {string|RegExp} text
 */
export function json_mustFindCellIndex(cells, text) {
	const index = json_findCellIndex(cells, text)
	if (index !== -1) return index
	throw new Error(`can not find '${text}' in ` + cells.map(x => json_getText(x)).join(' '))
}
