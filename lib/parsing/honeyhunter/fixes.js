import { warn } from '#lib/utils/logs.js'

/**
 * @typedef {{
 *   statuses: {
 *     weapons: {actually:'released', name:string, _used?:boolean}[],
 *   },
 *   items: {code:string, fixFunc:(item:import('#lib/parsing').ItemData) => boolean, _used?:boolean}[],
 *   travelerLangNames: Partial<Record<import('#lib/genshin').GI_ElementCode, Record<string, string>>>,
 *   skipEnemies: (RegExp & {_used?:boolean})[],
 *   manualEnemyGroups: {origNames:RegExp, name?:Record<string,string>}[],
 * }} HoneyhunterFixes
 */

/**
 * @param {HoneyhunterFixes} fixes
 */
export function clearHoneyhunterFixesUsage(fixes) {
	fixes.statuses.weapons.forEach(x => (x._used = false))
	fixes.items.forEach(x => (x._used = false))
	fixes.skipEnemies.forEach(x => (x._used = false))
}
/**
 * @param {HoneyhunterFixes} fixes
 */
export function checkHoneyhunterFixesUsage(fixes) {
	fixes.statuses.weapons.forEach((x, i) => {
		if (!x._used) warn(`fixes.honeyhunter.statuses[${i}] (${x.name}) was not used`)
	})
	fixes.items.forEach((x, i) => {
		if (!x._used) warn(`fixes.items[${i}] was not used`)
	})
	fixes.skipEnemies.forEach((x, i) => {
		if (!x._used) warn(`fixes.skipEnemies[${i}] (${x}) was not used`)
	})
}
