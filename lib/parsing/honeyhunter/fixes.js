import { warn } from '#lib/utils.js'

/**
 * @typedef {{
 *   statuses: {
 *     weapons: {actually:'released', name:string, _used?:boolean}[],
 *   },
 *   travelerLangNames: Partial<Record<import('#lib/genshin').GI_ElementCode, Record<string, string>>>,
 * }} HoneyhunterFixes
 */

/**
 * @param {HoneyhunterFixes} fixes
 */
export function clearHoneyhunterFixesUsage(fixes) {
	fixes.statuses.weapons.forEach(x => (x._used = false))
}
/**
 * @param {HoneyhunterFixes} fixes
 */
export function checkHoneyhunterFixesUsage(fixes) {
	fixes.statuses.weapons.forEach((x, i) => {
		if (!x._used) warn(`fixes.honeyhunter.statuses[${i}] (${x.name}) was not used`)
	})
}
