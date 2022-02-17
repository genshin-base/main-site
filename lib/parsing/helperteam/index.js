import { json_getSheet } from './json.js'
import { json_extractArtifactsInfo } from './artifacts.js'
import { json_processElementTable } from './characters.js'
import { GI_ELEMENT_CODES, GI_WEAPON_TYPE_CODES } from '#lib/genshin.js'
import { json_extractWeaponsInfo } from './weapons.js'
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

	const artifacts = json_extractArtifactsInfo(json_getSheet(spreadsheet, 'artifacts'), knownCodes.artifacts)

	const weapons = GI_WEAPON_TYPE_CODES.map(type => {
		const sheet = json_getSheet(spreadsheet, new RegExp(`^${type}s?$`, 'i'))
		return json_extractWeaponsInfo(sheet, type, knownCodes.weapons)
	}).flat()

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

	return {
		builds: {
			characters,
			artifacts,
			weapons,
		},
		changelogs,
	}
}

/**
 * @template TIn
 * @template {import('./types').LangMode} TOut
 * @param {import('./types').CharacterBuildInfoRole<TIn>} role
 * @param {TOut} mode
 * @param {((val:import('./types').LangsIf<TIn, import('./text').CompactTextParagraphs|null>) =>
 *   import('./types').LangsIf<TOut, import('./text').CompactTextParagraphs|null>)} mapFunc
 * @returns {import('./types').CharacterBuildInfoRole<TOut>}
 */
export function buildRoleConvertLangMode(role, mode, mapFunc) {
	return {
		...role,
		artifacts: {
			...role.artifacts,
			sets: role.artifacts.sets.map(set => ({ ...set, notes: mapFunc(set.notes) })),
			notes: mapFunc(role.artifacts.notes),
		},
		weapons: {
			...role.weapons,
			advices: role.weapons.advices.map(x => ({
				...x,
				similar: x.similar.map(x => ({ ...x, notes: mapFunc(x.notes) })),
			})),
			notes: mapFunc(role.weapons.notes),
		},
		mainStats: {
			...role.mainStats,
			notes: mapFunc(role.mainStats.notes),
			sands: { ...role.mainStats.sands, notes: mapFunc(role.mainStats.sands.notes) },
			circlet: { ...role.mainStats.circlet, notes: mapFunc(role.mainStats.circlet.notes) },
			goblet: { ...role.mainStats.goblet, notes: mapFunc(role.mainStats.goblet.notes) },
		},
		subStats: {
			...role.subStats,
			notes: mapFunc(role.subStats.notes),
			advices: role.subStats.advices.map(x => ({ ...x, notes: mapFunc(x.notes) })),
		},
		talents: {
			...role.talents,
			notes: mapFunc(role.talents.notes),
		},
		tips: mapFunc(role.tips),
		notes: mapFunc(role.notes),
	}
}

/**
 * @template TIn
 * @template {import('./types').LangMode} TOut
 * @param {import('./types').BuildInfo<TIn>} builds
 * @param {TOut} mode
 * @param {((val:import('./types').LangsIf<TIn, import('./text').CompactTextParagraphs|null>) =>
 *   import('./types').LangsIf<TOut, import('./text').CompactTextParagraphs|null>)} mapFunc
 * @returns {import('./types').BuildInfo<TOut>}
 */
export function buildsConvertLangMode(builds, mode, mapFunc) {
	/**
	 * @param {import('./types').LangsIf<TOut, import('./text').CompactTextParagraphs|null>} val
	 * @returns {import('./types').LangsIf<TOut, import('./text').CompactTextParagraphs>}
	 */
	function notNull(val) {
		if (mode === 'monolang' && val === null) throw new Error(`lang value is null, it must be not`)
		if (mode === 'multilang') {
			const nullItem = Object.entries(/**@type {*}*/ (val)).find(([k, v]) => v === null)
			if (nullItem) throw new Error(`lang '${nullItem[0]}' value is null, it must be not`)
		}
		// @ts-ignore
		return val
	}
	return {
		...builds,
		characters: builds.characters.map(char => ({
			...char,
			credits: mapFunc(char.credits),
			roles: char.roles.map(role => buildRoleConvertLangMode(role, mode, mapFunc)),
		})),
		artifacts: builds.artifacts.map(art => ({
			...art,
			sets:
				'1' in art.sets
					? { 1: notNull(mapFunc(art.sets[1])) }
					: { 2: notNull(mapFunc(art.sets[2])), 4: notNull(mapFunc(art.sets[4])) },
		})),
		weapons: builds.weapons.map(weapon => ({
			...weapon,
			passiveStat: notNull(mapFunc(weapon.passiveStat)),
		})),
	}
}
