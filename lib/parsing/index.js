import { json_getSheet } from './json.js'
import { json_extractArtifactsInfo } from './artifacts.js'
import { json_processElementTable } from './characters.js'
import { GI_ELEMENT_CODES, GI_WEAPON_TYPE_CODES } from '../genshin.js'
import { json_extractWeaponsInfo } from './weapons.js'
import { json_processChangelogsTable } from './changelogs.js'

/** @typedef {import('./artifacts').ArtifactInfo} ArtifactInfo */
/** @typedef {import('./weapons').WeaponInfo} WeaponInfo */

/**
 * @typedef {{
 *   elementMap: Record<string, import('./characters').CharacterBuildInfo[]>,
 *   artifacts: ArtifactInfo[],
 *   weapons: WeaponInfo[],
 *   changelogsTable: import('./changelogs').ChangelogsTable,
 * }} BuildInfo
 */

/**
 * @param {import('../google').Spreadsheet} spreadsheet
 * @param {import('./fixes').BuildsExtractionFixes} fixes
 * @returns {Promise<BuildInfo>}
 */
export async function extractBuilds(spreadsheet, fixes) {
	for (const sheet of spreadsheet.sheets)
		for (const fix of fixes.sheets)
			if (fix.title.test(sheet.properties.title.trim()))
				if (fix.fixFunc(sheet)) {
					fix._used = true
				}

	const artifacts = json_extractArtifactsInfo(json_getSheet(spreadsheet, 'artifacts'))

	const weapons = GI_WEAPON_TYPE_CODES.map(type =>
		json_extractWeaponsInfo(json_getSheet(spreadsheet, new RegExp(`^${type}s?$`, 'i')), type, fixes),
	).flat()

	const elementMap = /**@type {Record<string,import('./characters').CharacterBuildInfo[]>}*/ ({})
	for (const code of GI_ELEMENT_CODES)
		if (code !== 'dendro')
			elementMap[code] = json_processElementTable(
				json_getSheet(spreadsheet, code),
				artifacts,
				weapons,
				fixes,
			)

	const changelogsTable = json_processChangelogsTable(json_getSheet(spreadsheet, 'changelogs'), fixes)

	return {
		elementMap,
		artifacts,
		weapons,
		changelogsTable,
	}
}
