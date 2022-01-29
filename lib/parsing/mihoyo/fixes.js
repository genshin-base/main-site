import { warn } from '#lib/utils/logs.js'

/**
 * @typedef {{
 *   enemiesOnMap: {nameOnMap:string, useCode:string, _used?:boolean}[]
 * }} MihoyoFixes
 */

/**
 * @param {MihoyoFixes} fixes
 */
export function clearMihoyoFixesUsage(fixes) {
	fixes.enemiesOnMap.forEach(x => (x._used = false))
}
/**
 * @param {MihoyoFixes} fixes
 */
export function checkMihoyoFixesUsage(fixes) {
	fixes.enemiesOnMap.forEach((x, i) => {
		if (!x._used) warn(`fixes.mihoyo.enemiesOnMap[${i}] (${x.nameOnMap}) was not used`)
	})
}
