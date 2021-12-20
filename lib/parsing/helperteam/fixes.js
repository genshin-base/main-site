import { warn } from '#lib/utils.js'

/**
 * @typedef {{
 *   sheets: {title:RegExp, fixFunc(sheet):boolean, _used?:boolean}[],
 * }} HelperteamFixes
 */

/**
 * @param {HelperteamFixes} fixes
 */
export function clearHelperteamFixesUsage(fixes) {
	fixes.sheets.forEach(x => (x._used = false))
}

/**
 * @param {HelperteamFixes} fixes
 */
export function checkHelperteamFixesUsage(fixes) {
	fixes.sheets.forEach((x, i) => {
		if (!x._used) warn(`fixes.helperteam.sheets[${i}] (${x.title}) was not used`)
	})
}
