/** @returns {string} */
export function json_getText(cell) {
	return cell.userEnteredValue?.stringValue ?? ''
}

export function json_extractText(cell) {
	//TODO
	if (!cell) return ''
	return json_getText(cell)
}

/**
 * @param {any} jsonData
 * @param {string|RegExp} name
 */
export function json_getSheet(jsonData, name) {
	const sheet = jsonData.sheets.find(x =>
		typeof name === 'string'
			? x.properties.title.trim().toLocaleLowerCase() === name
			: name.test(x.properties.title.trim()),
	)
	if (!sheet)
		throw new Error(
			`sheet '${name}' not found, available: ` + jsonData.sheets.map(x => x.properties.title.trim()),
		)
	if (sheet.data.length > 1)
		console.warn(`WARN: sheet '${name}' has ${sheet.data.length} sheet(s), expected 1`)
	return sheet
}

/**
 * @param {any} cells
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
 * @param {any} cells
 * @param {string|RegExp} text
 */
export function json_mustFindCellIndex(cells, text) {
	const index = json_findCellIndex(cells, text)
	if (index !== -1) return index
	throw new Error(`can not find '${text}' in ` + cells.map(x => json_getText(x)).join(' '))
}
