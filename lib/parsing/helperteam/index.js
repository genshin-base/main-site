import { json_getSheet } from './json.js'
import { json_extractArtifactsInfo } from './artifacts.js'
import { json_processElementTable } from './characters.js'
import { GI_ELEMENT_CODES, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { json_extractWeaponsInfo } from './weapons.js'
import { json_processChangelogsTable } from './changelogs.js'

/** @typedef {import('./artifacts').ArtifactInfo} ArtifactInfo */
/** @typedef {import('./weapons').WeaponInfo} WeaponInfo */

/**
 * @typedef {{
 *   characters: import('./characters').CharacterBuildInfo[],
 *   artifacts: ArtifactInfo[],
 *   weapons: WeaponInfo[],
 *   changelogsTable: import('./changelogs').ChangelogsTable,
 * }} BuildInfo
 */

/**
 * @param {import('#lib/google').Spreadsheet} spreadsheet
 * @param {import('./common').KnownItemCodes} knownCodes
 * @param {import('./fixes').BuildsExtractionFixes} fixes
 * @returns {Promise<BuildInfo>}
 */
export async function extractBuilds(spreadsheet, knownCodes, fixes) {
	for (const sheet of spreadsheet.sheets)
		for (const fix of fixes.sheets)
			if (fix.title.test(sheet.properties.title.trim()))
				if (fix.fixFunc(sheet)) {
					fix._used = true
				}

	const artifacts = json_extractArtifactsInfo(json_getSheet(spreadsheet, 'artifacts'), knownCodes.artifacts)

	const weapons = GI_WEAPON_TYPE_CODES.map(type => {
		const sheet = json_getSheet(spreadsheet, new RegExp(`^${type}s?$`, 'i'))
		return json_extractWeaponsInfo(sheet, type, knownCodes.weapons)
	}).flat()
	const weaponCode2typeCode = new Map(weapons.map(x => [x.code, x.typeCode]))

	const characters = /**@type {import('./characters').CharacterBuildInfo[]}*/ ([])
	for (const elementCode of GI_ELEMENT_CODES)
		if (elementCode !== 'dendro')
			characters.push(
				...json_processElementTable(
					json_getSheet(spreadsheet, elementCode),
					elementCode,
					knownCodes,
					weaponCode2typeCode,
					fixes,
				),
			)

	const changelogsTable = json_processChangelogsTable(json_getSheet(spreadsheet, 'changelogs'), fixes)

	return {
		characters,
		artifacts,
		weapons,
		changelogsTable,
	}
}
