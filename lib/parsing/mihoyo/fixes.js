import { warn } from '#lib/utils/logs.js'

/**
 * @typedef {{
 *   map: {
 *     search: {nameOnMap:string, useCode:string, _used?:boolean}[]
 *   }
 * }} MihoyoFixes
 */

/**
 * @param {MihoyoFixes} fixes
 */
export function clearMihoyoFixesUsage(fixes) {
	fixes.map.search.forEach(x => (x._used = false))
}
/**
 * @param {MihoyoFixes} fixes
 */
export function checkMihoyoFixesUsage(fixes) {
	fixes.map.search.forEach((x, i) => {
		if (!x._used) warn(`fixes.mihoyo.map.search[${i}] (${x.nameOnMap}) was not used`)
	})
}
