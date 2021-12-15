/** @typedef {import('./artifacts').ArtifactInfo} ArtifactInfo */
/** @typedef {import('./weapons').WeaponInfo} WeaponInfo */
/** @typedef {import('./json').OneOrMoreTextNodes} OneOrMoreTextNodes */

import { mustBeDefined } from '../utils.js'
import {
	extractArtifactMainStatAdvices,
	extractArtifactRefsGroups,
	extractArtifactSubStatAdvices,
} from './artifacts.js'
import { json_extractText, json_findCellIndex, json_getText, json_mustFindCellIndex } from './json.js'
import { extractWeaponRefs } from './weapons.js'

/**
 * @typedef {{
 *   code: string,
 *   isBest: boolean,
 *   weapons: import('./weapons').WeaponRefs,
 *   artifacts: import('./artifacts').ArtifactRefs,
 *   mainStats: import('./artifacts').ArtifactMainStatAdvices,
 *   subStats: import('./artifacts').ArtifactSubStatAdvices,
 *   talent: OneOrMoreTextNodes,
 *   tips: OneOrMoreTextNodes,
 * }} CharacterBuildInfoRole
 */

/**
 * @typedef {{
 *   code: string
 *   roles: CharacterBuildInfoRole[],
 *   notes: OneOrMoreTextNodes,
 * }} CharacterBuildInfo
 */

/**
 * @typedef {{
 *   buildInfo: CharacterBuildInfo,
 *   nameCol: number,
 *   roleCol: number,
 *   talentCol: number,
 *   tipsCol: number,
 *   ext: {
 *     weaponCol: number,
 *     artifactCol: number,
 *     mainStatsCol: number,
 *     subStatsCol: number
 *   }|null,
 * }} CharacterBlock
 */

/**
 * @param {string} name
 */
export function getCharacterCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s/g, '-')
}

/**
 * @param {import('../google').Sheet} sheet
 * @param {ArtifactInfo[]} artifacts
 * @param {WeaponInfo[]} weapons
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 */
export function json_processElementTable(sheet, artifacts, weapons, fixes) {
	const code2artifact = new Map(artifacts.map(x => [x.code, x]))
	const code2weapon = new Map(weapons.map(x => [x.code, x]))

	const characters = /**@type {CharacterBuildInfo[]}*/ ([])
	let charBlock = /**@type {CharacterBlock|null}*/ (null)
	function applyCharBlockUnlessEmpty() {
		if (charBlock !== null) characters.push(charBlock.buildInfo)
		charBlock = null
	}

	for (const { values: cells = [] } of sheet.data[0].rowData) {
		if (json_findCellIndex(cells, /^(?:artifact stats|stats priority)$/) !== -1) {
			applyCharBlockUnlessEmpty()
			const nameCol = cells.findIndex(x => json_getText(x) !== '')
			const code = getCharacterCodeFromName(json_getText(cells[nameCol]))
			charBlock = {
				buildInfo: { code, roles: [], notes: [] },
				nameCol,
				roleCol: json_mustFindCellIndex(cells, 'role'),
				talentCol: json_mustFindCellIndex(cells, 'talent priority'),
				tipsCol: json_mustFindCellIndex(cells, /ability tips?/),
				ext: null,
			}
		} else if (charBlock && !charBlock.ext && -1 !== json_findCellIndex(cells, /^main stats?$/)) {
			charBlock.ext = {
				weaponCol: json_findCellIndex(cells, 'weapon'),
				artifactCol: json_findCellIndex(cells, 'artifact'),
				mainStatsCol: json_findCellIndex(cells, /main stats?/),
				subStatsCol: json_findCellIndex(cells, /sub ?stats?/),
			}
		} else if (charBlock?.ext) {
			const firstCellText = json_getText(cells[charBlock.nameCol]).trim()
			if (firstCellText && firstCellText.match(/^notes/i)) {
				charBlock.buildInfo.notes = json_extractText(cells[charBlock.nameCol + 1])
				applyCharBlockUnlessEmpty()
			} else {
				const roleName = json_getText(cells[charBlock.roleCol]).trim()
				if (roleName !== '') {
					const artGroups = extractArtifactRefsGroups(
						json_getText(cells[charBlock.ext.artifactCol]).trim().split(/\n+/),
						code2artifact,
						charBlock.buildInfo.code,
						fixes,
					)
					const firstAtrGroup = mustBeDefined(artGroups.pop())
					/** @type {CharacterBuildInfoRole} */
					const role = {
						code: (firstAtrGroup.title ?? roleName.replace('⭐', '').trim()).toLocaleLowerCase(),
						isBest: roleName.includes('⭐'),
						weapons: extractWeaponRefs(
							json_getText(cells[charBlock.ext.weaponCol]).trim().split(/\n+/),
							code2weapon,
							charBlock.buildInfo.code,
							fixes,
						),
						artifacts: firstAtrGroup.refs,
						mainStats: extractArtifactMainStatAdvices(
							json_getText(cells[charBlock.ext.mainStatsCol]).trim().split(/\n+/),
							charBlock.buildInfo.code,
							fixes,
						),
						subStats: extractArtifactSubStatAdvices(
							json_getText(cells[charBlock.ext.subStatsCol]).trim().split(/\n+/),
							charBlock.buildInfo.code,
							fixes,
						),
						talent: json_extractText(cells[charBlock.talentCol]),
						tips: json_extractText(cells[charBlock.tipsCol]),
					}

					charBlock.buildInfo.roles.push(role)
					for (const artGroup of artGroups) {
						/** @type {CharacterBuildInfoRole} */
						const copy = JSON.parse(JSON.stringify(role))
						copy.artifacts = artGroup.refs
						charBlock.buildInfo.roles.push(copy)
					}
				}
			}
		}
	}

	return characters
}
