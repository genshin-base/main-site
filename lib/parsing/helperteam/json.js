import { debuglog } from 'util'
import { warn } from '#lib/utils.js'
import { isTextBlank } from './text.js'

const styleLog = debuglog('style')

const TEXT_FORMAT_USED_ATTRS = new Set(['link', 'bold', 'italic', 'underline', 'strikethrough'])

/**
 * @param {import('#lib/google').CellData|undefined} cell
 * @returns {string}
 */
export function json_getText(cell) {
	return cell?.userEnteredValue?.['stringValue'] ?? ''
}

/**
 * @param {import('#lib/google').CellData|undefined} cell
 * @returns {string[]}
 */
export function json_getTextLines(cell) {
	return json_getText(cell).trim().split(/\n+/)
}

/**
 * @callback TextPreprocessFunc
 * @param {string} text
 * @param {import('#lib/google').TextFormat} defaultFormat
 * @param {import('#lib/google').TextFormatRun[]} formatRuns
 * @returns {[string, import('#lib/google').TextFormat, import('#lib/google').TextFormatRun[]]}
 */

/**
 * @param {import('#lib/google').CellData|undefined} cell
 * @param {number|null} [startOffset]
 * @param {number|null} [endOffset]
 * @param {TextPreprocessFunc} [preprocess]
 * @returns {import('./text').CompactTextParagraphs}
 */
export function json_extractText(cell, startOffset, endOffset, preprocess) {
	if (!cell) return []
	let text = /**@type {string}*/ (cell.userEnteredValue?.['stringValue'] ?? '')
	if (!text) return []
	startOffset ??= 0
	endOffset ??= text.length

	let defaultFormat = cell.userEnteredFormat?.textFormat ?? {}
	let formatRuns = (cell.textFormatRuns ?? []).slice()
	json_cleanFormatRuns(formatRuns)
	formatRuns = json_optimizeFormatRuns(formatRuns)
	json_alignLinksWithWords(text, formatRuns)
	json_alignStylesWithPunctuation(text, formatRuns)
	if (preprocess) [text, defaultFormat, formatRuns] = preprocess(text, defaultFormat, formatRuns)

	const paragraphs = /**@type {import('./text').TextNodeP[]}*/ ([])
	const pTexts = text.slice(startOffset, endOffset).split(/(\n[\n\s]*\n)/)
	for (let i = 0, textOffset = startOffset; i < pTexts.length; i += 2) {
		const pText = pTexts[i]
		const sep = pTexts[i + 1] ?? ''
		const pFormatRuns = json_sliceFormatRuns(formatRuns, textOffset, textOffset + pText.length)

		let children
		if (pFormatRuns.length > 0) {
			/**@type {import('./text').TextNodeInline[]}*/
			children = pFormatRuns.map((run, i, runs) => {
				const format = { ...defaultFormat, ...run.format }
				const nextIndex = i < runs.length - 1 ? runs[i + 1].startIndex : textOffset + pText.length
				const href = format.link?.uri

				let nodeText = text.slice(run.startIndex ?? 0, nextIndex)
				if (i === 0) nodeText = nodeText.trimStart()
				if (i === runs.length - 1) nodeText = nodeText.trimEnd()

				let node = /**@type {import('./text').TextNodeInline}*/ (nodeText)
				if (format.bold) node = { b: node }
				if (format.italic) node = { i: node }
				if (format.underline && !href) node = { u: node }
				if (format.strikethrough) node = { s: node }
				if (href) node = { a: node, href }
				return node
			})
		} else {
			children = [pText]
		}

		while (children.length > 0 && isTextBlank(children[0])) children.shift()
		while (children.length > 0 && isTextBlank(children[children.length - 1])) children.pop()

		if (!isTextBlank(children)) paragraphs.push({ p: children.length === 1 ? children[0] : children })

		textOffset += pText.length + sep.length
	}
	return paragraphs.length === 1 ? paragraphs[0].p : paragraphs
}

/**
 * @param {import('#lib/google').TextFormatRun[]} runs
 * @param {number} start
 * @param {number} end
 */
function json_sliceFormatRuns(runs, start, end) {
	const res = []
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
 * @param {import('#lib/google').TextFormatRun[]} runs
 * @param {number} start
 * @param {number} end
 * @param {number} fullLength
 */
function json_deleteFormatRuns(runs, start, end, fullLength) {
	for (let i = 0; i < runs.length; i++) {
		const run = runs[i]
		const next = i < runs.length - 1 ? runs[i + 1] : null
		const startIndex = run.startIndex ?? 0
		const endIndex = next ? next.startIndex ?? 0 : fullLength
		if (startIndex >= start && startIndex < end) {
			if (endIndex > end) {
				runs[i] = { ...run, startIndex: end }
			} else {
				runs.splice(i--, 1)
			}
		}
	}
}

/**
 * @param {import('#lib/google').TextFormatRun[]} runs
 */
function json_cleanFormatRuns(runs) {
	for (let i = 0; i < runs.length; i++) {
		const run = runs[i]
		// removing underlines from links
		if (run.format.link && 'underline' in run.format) {
			const format = { ...run.format }
			delete format.underline
			runs[i] = { ...run, format }
		}
	}
}

/**
 * @param {import('#lib/google').TextFormatRun[]} runs
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
 * @param {import('#lib/google').TextFormat} a
 * @param {import('#lib/google').TextFormat} b
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
 * @param {string} text
 * @param {import('#lib/google').TextFormatRun[]} formatRuns
 * @param {(run:import('#lib/google').TextFormatRun, i:number, start:number, end:number) => null|[i:number, start:number, end:number]} runFunc
 * @param {(run:import('#lib/google').TextFormatRun, origText:string, fixedText:string) => unknown} logFunc
 */
function json_realignFormatRuns(text, formatRuns, runFunc, logFunc) {
	for (let i = 0; i < formatRuns.length; i++) {
		const run = formatRuns[i]

		let start = formatRuns[i].startIndex ?? 0
		let end = i < formatRuns.length - 1 ? formatRuns[i + 1].startIndex ?? 0 : text.length
		const origStart = start
		const origEnd = end

		const res = runFunc(run, i, start, end)
		if (!res) continue
		;[i, start, end] = res

		// applying change
		if (start !== origStart) {
			formatRuns[i] = { ...formatRuns[i], startIndex: start }
		}
		if (end !== origEnd && i < formatRuns.length - 1) {
			formatRuns[i + 1] = { ...formatRuns[i + 1], startIndex: end }
		}

		// logging change
		if (start !== origStart || end !== origEnd) {
			const orig = JSON.stringify(text.slice(origStart, origEnd))
			const fixed = JSON.stringify(text.slice(start, end))
			logFunc(run, orig, fixed)
		}
	}
}

/**
 * @param {string} text
 * @param {import('#lib/google').TextFormatRun[]} formatRuns
 */
function json_alignLinksWithWords(text, formatRuns) {
	json_realignFormatRuns(
		text,
		formatRuns,
		(run, i, start, end) => {
			if (!run.format.link) return null
			const uri = run.format.link

			// extending start over underlines (<--start)
			if (i > 0 && formatRuns[i - 1].format.underline) {
				start = formatRuns[i - 1].startIndex ?? 0
				formatRuns.splice(i - 1, 1)
				i -= 1
			}
			// extending end over underlines (end-->)
			if (i < formatRuns.length - 1 && formatRuns[i + 1].format.underline) {
				end = i < formatRuns.length - 2 ? formatRuns[i + 2].startIndex ?? 0 : text.length
				formatRuns.splice(i + 1, 1)
			}

			let m
			// removing leading spaces (start-->)
			if ((m = text.slice(start, end).match(/^\s+/)) !== null) {
				const shift = m[0].length
				if (shift >= end - start) {
					warn(`link is applied to blank string, skipping (${uri})`)
				} else {
					start += shift
				}
			}
			// aligning start with word (<--start)
			if ((m = text.slice(0, start).match(/\w+$/)) !== null) {
				const shift = m[0].length
				const prevStart = start
				start -= shift
				const prevLen = formatRuns.length
				json_deleteFormatRuns(formatRuns, start, prevStart, text.length)
				i -= prevLen - formatRuns.length
			}
			// removing trailing spaces (<--end)
			if ((m = text.slice(start, end).match(/\s+$/)) !== null) {
				const shift = m[0].length
				if (shift >= end - start) {
					warn(`link is applied to blank string, skipping (${uri})`)
				} else {
					end -= shift
				}
			}
			// aligning end with word (end-->)
			if ((m = text.slice(end).match(/^\w+/)) !== null) {
				const shift = m[0].length
				const prevEnd = end
				end += shift
				json_deleteFormatRuns(formatRuns, prevEnd, end, text.length)
			}

			return [i, start, end]
		},
		(run, origText, fixedText) => {
			styleLog(`moved link '${run.format.link?.uri}' range from ${origText} to ${fixedText}`)
		},
	)
}

/**
 * @param {string} text
 * @param {import('#lib/google').TextFormatRun[]} formatRuns
 */
function json_alignStylesWithPunctuation(text, formatRuns) {
	json_realignFormatRuns(
		text,
		formatRuns,
		(run, i, start, end) => {
			if (!run.format.bold && !run.format.italic) return null

			let m
			if ((m = text.slice(end).match(/^[.,:;?!]/)) !== null) {
				const shift = m[0].length
				end += shift
				json_deleteFormatRuns(formatRuns, end - shift, end, text.length)
			}

			return [i, start, end]
		},
		(run, origText, fixedText) => {
			let type = '???'
			if (run.format.bold) type = 'bold'
			if (run.format.italic) type = 'italic'
			styleLog(`moved ${type} range from ${origText} to ${fixedText}`)
		},
	)
}

/**
 * @param {import('#lib/google').Spreadsheet} spreadsheet
 * @param {string|RegExp} name
 * @returns {import('#lib/google').Sheet}
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
	if (sheet.data.length > 1) warn(`sheet '${name}' has ${sheet.data.length} sheet(s), expected 1`)
	return sheet
}

/**
 * @param {import('#lib/google').CellData[]} cells
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
 * @param {import('#lib/google').CellData[]} cells
 * @param {string|RegExp} text
 */
export function json_mustFindCellIndex(cells, text) {
	const index = json_findCellIndex(cells, text)
	if (index !== -1) return index
	throw new Error(`can not find '${text}' in ` + cells.map(x => json_getText(x)).join(' '))
}
