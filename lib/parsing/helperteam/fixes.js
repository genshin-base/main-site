import { warn } from '#lib/utils.js'

/**
 * @typedef {{
 *   roleNotes: {character:string, role:string, searchAs:string, _used?:boolean}[],
 *   sheets: {title:RegExp, fixFunc(sheet):boolean, _used?:boolean}[],
 * }} HelperteamFixes
 */

/**
 * @param {HelperteamFixes} fixes
 */
export function clearHelperteamFixesUsage(fixes) {
	fixes.roleNotes.forEach(x => (x._used = false))
	fixes.sheets.forEach(x => (x._used = false))
}

/**
 * @param {HelperteamFixes} fixes
 */
export function checkHelperteamFixesUsage(fixes) {
	fixes.roleNotes.forEach((x, i) => {
		if (!x._used) warn(`fixes.helperteam.roleNotes[${i}] (${x.character}:${x.role}) was not used`)
	})
	fixes.sheets.forEach((x, i) => {
		if (!x._used) warn(`fixes.helperteam.sheets[${i}] (${x.title}) was not used`)
	})
}
