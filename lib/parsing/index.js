import { promises as fs } from 'fs'
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
 * @param {string} jsonFPath
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {Promise<BuildInfo>}
 */
export async function extractBuilds(jsonFPath, fixes) {
	const jsonData = JSON.parse(await fs.readFile(jsonFPath, 'utf-8'))
	for (const sheet of jsonData.sheets)
		for (const fix of fixes.sheets)
			if (fix.title.test(sheet.properties.title.trim()))
				if (fix.fixFunc(sheet)) {
					fix._used = true
				}

	const { artifacts, weapons } = extractItemsInfo(jsonData, fixes)

	return await processSpreadsheets(jsonData, artifacts, weapons, fixes)
}

/**
 * @return {{artifacts: ArtifactInfo[], weapons: WeaponInfo[]}}
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 */
function extractItemsInfo(jsonData, fixes) {
	return {
		artifacts: json_extractArtifactsInfo(json_getSheet(jsonData, 'artifacts')),
		weapons: GI_WEAPON_TYPE_CODES.map(type =>
			json_extractWeaponsInfo(json_getSheet(jsonData, new RegExp(`^${type}s?$`, 'i')), type, fixes),
		).flat(),
	}
}

/**
 * @param {any} jsonData
 * @param {ArtifactInfo[]} artifacts
 * @param {WeaponInfo[]} weapons
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {Promise<BuildInfo>}
 */
async function processSpreadsheets(jsonData, artifacts, weapons, fixes) {
	const elementMap = /**@type {Record<string,import('./characters').CharacterBuildInfo[]>}*/ ({})
	for (const code of GI_ELEMENT_CODES)
		if (code !== 'dendro')
			elementMap[code] = json_processElementTable(
				json_getSheet(jsonData, code),
				artifacts,
				weapons,
				fixes,
			)

	let changelogsTable = json_processChangelogsTable(json_getSheet(jsonData, 'changelogs'), fixes)

	return {
		elementMap,
		artifacts,
		weapons,
		changelogsTable,
	}
}
