/**
 * @typedef {{
 *   weapons: {col:'name'|'mainStat'|'subStat', replace:RegExp, with:string, _used?:boolean}[],
 *   charactersArtifactsMatch: {characterCodes:string[], replace:RegExp, with:string, _used?:boolean}[]
 *   charactersWeaponsMatch: {characterCodes:string[], replace:RegExp, with:string, _used?:boolean}[]
 *   sheets: {title:RegExp, fixFunc(sheet):boolean, _used?:boolean}[],
 * }} BuildsExtractionFixes
 */

/**
 * @param {{replace:RegExp, with:string, _used?:boolean}} fix
 * @param {string} text
 */
export function tryApplyTextFix(fix, text) {
	const newText = text.replace(fix.replace, fix.with)
	if (newText !== text) fix._used = true
	return newText
}

/**
 * @param {BuildsExtractionFixes} fixes
 */
export function clearFixesUsage(fixes) {
	for (const attr of [
		fixes.weapons,
		fixes.charactersArtifactsMatch,
		fixes.charactersWeaponsMatch,
		fixes.sheets,
	])
		attr.forEach(clear)
}
/**
 * @param {BuildsExtractionFixes} fixes
 */
export function checkFixesUsage(fixes) {
	fixes.weapons.forEach((x, i) => checkReplacerUsage(x, `fixes.weapons[${i}]`))
	fixes.charactersArtifactsMatch.forEach((x, i) =>
		checkReplacerUsage(x, `fixes.charactersArtifactsMatch[${i}]`),
	)
	fixes.charactersWeaponsMatch.forEach((x, i) =>
		checkReplacerUsage(x, `fixes.charactersWeaponsMatch[${i}]`),
	)
	fixes.sheets.forEach((x, i) => {
		if (!x._used) console.warn(`WARN: fixes.sheets[${i}] (${x.title}) was not used`)
	})
}

/** @param {{_used?:boolean}} x */
function clear(x) {
	x._used = false
}
/**
 * @param {{replace:RegExp, _used?:boolean}} x
 */
function checkReplacerUsage(x, name) {
	if (!x._used) console.warn(`WARN: ${name} (${x.replace}) was not used`)
}
