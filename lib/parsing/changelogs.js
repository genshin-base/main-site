import { json_extractText, json_findCellIndex, json_getText, json_mustFindCellIndex } from './json.js'

/**
 * @typedef {{
 *   rows: {date:string, changes:import('./json').OneOrMoreTextNodes, appliedBy:string}[],
 * }} ChangelogsTable
 */

/**
 * @param {import('../google').Sheet} sheet
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {ChangelogsTable}
 */
export function json_processChangelogsTable(sheet, fixes) {
	const rows = /**@type {ChangelogsTable["rows"]}*/ ([])

	let headInfo = /**@type {{dateCol:number, changesCol:number, appliedCol:number}|null}*/ (null)
	for (const { values: cells = [] } of sheet.data[0].rowData) {
		if (headInfo) {
			if (headInfo.appliedCol < cells.length) {
				let date = json_getText(cells[headInfo.dateCol]).trim()
				const changes = json_extractText(cells[headInfo.changesCol])
				let appliedBy = json_getText(cells[headInfo.appliedCol]).trim()

				const prevRow = rows[rows.length - 1]
				date ||= prevRow.date
				appliedBy ||= prevRow.appliedBy

				rows.push({ date, changes, appliedBy })
			}
		} else if (json_findCellIndex(cells, /^changes applied$/i) !== -1) {
			headInfo = {
				dateCol: json_mustFindCellIndex(cells, /date/i),
				changesCol: json_mustFindCellIndex(cells, /changes applied/i),
				appliedCol: json_mustFindCellIndex(cells, /applied by/i),
			}
		}
	}
	return { rows }
}
