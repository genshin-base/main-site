import { json_getSheet } from './json.js'
import { json_processElementTable } from './characters.js'
import { GI_ELEMENT_CODES } from '#lib/genshin.js'
import { json_processChangelogsTable } from './changelogs.js'

/**
 * @param {import('#lib/google').Spreadsheet} spreadsheet
 * @param {import('./common').KnownItemCodes} knownCodes
 * @param {import('./fixes').HelperteamFixes} fixes
 * @returns {Promise<{builds:import('./types').BuildInfo<'monolang'>, changelogs:import('./types').ChangelogsTable}>}
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
		if (elementCode !== 'dendro')
			characters.push(
				...json_processElementTable(
					json_getSheet(spreadsheet, elementCode),
					elementCode,
					knownCodes,
					fixes,
				),
			)

	const changelogs = json_processChangelogsTable(json_getSheet(spreadsheet, 'changelogs'), fixes)

	return { builds: { characters }, changelogs }
}
