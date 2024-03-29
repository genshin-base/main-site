import { warn } from '#lib/utils/logs.js'

/**
 * @typedef {{
 *   statuses: {
 *     characters: {actually:'unreleased', name:string, _used?:boolean}[],
 *     weapons: {actually:'released'|'unreleased', name:string, _used?:boolean}[],
 *   },
 *   travelerLangNames: Partial<Record<import('#lib/genshin').GI_ElementCode, Record<string, string>>>,
 *   skip: Record<'enemies'|'artifacts'|'items', (RegExp & {_used?:boolean})[]>,
 *   manualEnemyGroups: {origNames:RegExp, name?:Record<string,string>}[],
 *   domainMissingLocations: {code:string, location:import('#lib/genshin').MapLocation, _used?:boolean}[],
 *   postProcess: {
 *     items: (((items:import('#lib/parsing').Code2ItemData, code2img:Map<string,string>) => boolean) & {_used?:boolean})[],
 *     enemies: (((items:import('#lib/parsing').Code2EnemyData, code2img:Map<string,string>) => boolean) & {_used?:boolean})[],
 *     domains: (((items:import('#lib/parsing').Code2DomainData) => boolean) & {_used?:boolean})[],
 *     weapons: (((items:import('#lib/parsing').Code2WeaponData) => boolean) & {_used?:boolean})[],
 *     characters: (((items:import('#lib/parsing').Code2CharacterData) => boolean) & {_used?:boolean})[],
 *   },
 *   descriptionLangFix(text:string, lang:string):string,
 * }} HoneyhunterFixes
 */

/**
 * @param {HoneyhunterFixes} fixes
 */
export function clearHoneyhunterFixesUsage(fixes) {
	for (const attr in fixes.statuses) fixes.statuses[attr].forEach(x => (x._used = false))
	fixes.domainMissingLocations.forEach(x => (x._used = false))
	for (const attr in fixes.skip) fixes.skip[attr].forEach(x => (x._used = false))
	for (const attr in fixes.postProcess) fixes.postProcess[attr].forEach(x => (x._used = false))
}
/**
 * @param {HoneyhunterFixes} fixes
 */
export function checkHoneyhunterFixesUsage(fixes) {
	for (const attr in fixes.statuses)
		fixes.statuses[attr].forEach((x, i) => {
			if (!x._used) warn(`fixes.honeyhunter.${attr}[${i}] (${x.name}) was not used`)
		})
	fixes.domainMissingLocations.forEach((x, i) => {
		if (!x._used) warn(`fixes.domainMissingLocations[${i}] (${x.code}) was not used`)
	})
	for (const attr in fixes.skip)
		fixes.skip[attr].forEach((x, i) => {
			if (!x._used) warn(`fixes.skip.${attr}[${i}] (${x}) was not used`)
		})
	for (const attr in fixes.postProcess)
		fixes.postProcess[attr].forEach((x, i) => {
			if (!x._used) warn(`fixes.postProcess.${attr}[${i}] was not used`)
		})
}

/**
 * @param {(RegExp & {_used?:boolean})[]} regexps
 * @param {string} name
 */
export function shouldSkipByFix(regexps, name) {
	for (const fix of regexps)
		if (fix.test(name.trim())) {
			fix._used = true
			return true
		}
	return false
}

/**
 * @template {{code:string}} TItem
 * @template {unknown[]} TArgs
 * @param {(((code2item:Record<string, TItem>, ...args:TArgs) => boolean) & {_used?:boolean})[]} fixes
 * @param {Map<string, TItem>|null} id2item
 * @param {Record<string, TItem>} code2item
 * @param {TArgs} moreArgs
 */
export function applyItemsPostFixes(fixes, id2item, code2item, ...moreArgs) {
	for (const fix of fixes) {
		const used = fix(code2item, ...moreArgs)
		if (used) fix._used = true
	}
	if (id2item) {
		for (const item of id2item.values()) {
			if (item.code in code2item) {
				if (item !== code2item[item.code]) id2item.set(item.code, item)
			} else {
				id2item.delete(item.code)
			}
		}
	}
}
