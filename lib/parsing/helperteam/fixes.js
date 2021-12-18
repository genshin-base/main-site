import { warn } from '#lib/utils.js'

/**
 * @typedef {{
 *   sheets: {title:RegExp, fixFunc(sheet):boolean, _used?:boolean}[],
 * }} BuildsExtractionFixes
 */

/**
 * @param {BuildsExtractionFixes} fixes
 */
export function clearFixesUsage(fixes) {
	fixes.sheets.forEach(clear)
}
/**
 * @param {BuildsExtractionFixes} fixes
 */
export function checkFixesUsage(fixes) {
	fixes.sheets.forEach((x, i) => {
		if (!x._used) warn(`fixes.sheets[${i}] (${x.title}) was not used`)
	})
}

/** @param {{_used?:boolean}} x */
function clear(x) {
	x._used = false
}
