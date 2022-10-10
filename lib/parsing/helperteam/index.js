import { json_getSheet } from './text-json.js'
import { json_processElementTable } from './characters.js'
import { GI_ELEMENT_CODES } from '#lib/genshin.js'

/**
 * @param {import('#lib/google').Spreadsheet} spreadsheet
 * @param {import('./common').KnownItemCodes} knownCodes
 * @param {import('./fixes').HelperteamFixes} fixes
 * @returns {Promise<import('./types').BuildInfo<'monolang'>>}
 */
export async function extractBuilds(spreadsheet, knownCodes, fixes) {
	for (const sheet of spreadsheet.sheets)
		for (const fix of fixes.sheets)
			if (fix.title.test(sheet.properties.title.trim()))
				if (fix.fixFunc(sheet)) {
					fix._used = true
				}

	const characters = /**@type {import('./types').CharacterBuildInfo<'monolang'>[]}*/ ([])
	for (const elementCode of GI_ELEMENT_CODES)
		characters.push(
			...json_processElementTable(
				json_getSheet(spreadsheet, elementCode),
				elementCode,
				knownCodes,
				fixes,
			),
		)
	return { characters }
}
