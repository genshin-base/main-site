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
	return {
		...builds,
		characters: builds.characters.map(char => ({
			...char,
			credits: mapFunc(char.credits),
			roles: char.roles.map(role => buildRoleConvertLangMode(role, mode, mapFunc)),
		})),
	}
}
