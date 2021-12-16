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
 *   characters: import('./characters').CharacterBuildInfo[],
 *   artifacts: ArtifactInfo[],
 *   weapons: WeaponInfo[],
 *   changelogsTable: import('./changelogs').ChangelogsTable,
 * }} BuildInfo
 */

/**
 * @typedef {{
 *   code: string
 *   elementCode: import('../genshin').GI_ElementCode,
 *   weaponTypeCode: import('../genshin').GI_WeaponTypeCode,
 * }} CharacterShortInfo
 */

/**
 * @typedef {{
 *   character: import('./characters').CharacterBuildInfo & {name:string},
 *   artifacts: ArtifactInfo[],
 *   weapons: WeaponInfo[],
 * }} CharacterFullInfo
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

	const characters = /**@type {import('./characters').CharacterBuildInfo[]}*/ ([])
	for (const elementCode of GI_ELEMENT_CODES)
		if (elementCode !== 'dendro')
			characters.push(
				...json_processElementTable(
					json_getSheet(spreadsheet, elementCode),
					elementCode,
					artifacts,
					weapons,
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

/**
 * @param {BuildInfo} build
 * @returns {CharacterShortInfo[]}
 */
export function makeCharacterShortList(build) {
	return build.characters.map(x => ({
		code: x.code,
		elementCode: x.elementCode,
		weaponTypeCode: x.weaponTypeCode,
	}))
}

/**
 * @param {BuildInfo} build
 * @param {import('./characters').CharacterBuildInfo} character
 * @param {import('../../scripts/update_langs').ItemsLangNames} langNames
 * @param {string} lang
 * @returns {CharacterFullInfo}
 */
export function makeCharacterBuildInfo(build, character, langNames, lang) {
	const weaponCodes = new Set()
	const artifactCodes = new Set()
	for (const role of character.roles) {
		for (const ref of role.weapons.advices)
			for (const similar of ref.similar) weaponCodes.add(similar.code)
		for (const set of role.artifacts.sets)
			(function iter(node) {
				if ('code' in node) artifactCodes.add(node.code)
				else for (const art of node.arts) iter(art)
			})(set.arts)
	}
	let name = nameOrCode(character, langNames, lang)
	return {
		character: Object.assign({}, { name }, character),
		weapons: build.weapons.filter(x => weaponCodes.has(x.code)),
		artifacts: build.artifacts.filter(x => artifactCodes.has(x.code)),
	}
}

/**
 * @param {import('./changelogs').ChangelogsTable} changelogsTable
 * @returns {import('./changelogs').ChangelogsTable}
 */
export function makeRecentChangelogsTable(changelogsTable) {
	const rows = []
	let datesCount = 0
	let prevDate = ''
	for (const row of changelogsTable.rows) {
		if (row.date !== prevDate) {
			prevDate = row.date
			datesCount++
			if (datesCount > 3) break
		}
		rows.push(row)
	}
	return { rows }
}

/**
 * @param {{code:string}} obj
 * @param {import('../../scripts/update_langs').ItemsLangNames} langNames
 * @param {string} lang
 */
function nameOrCode(obj, langNames, lang) {
	const names = langNames[obj.code]
	const name = names?.[lang]
	if (name === undefined) console.warn(`WARN: can not find ${lang}-name for '${obj.code}', using code`)
	return name ?? obj.code
}
