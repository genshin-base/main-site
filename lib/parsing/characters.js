/** @typedef {import('./artifacts').ArtifactInfo} ArtifactInfo */
/** @typedef {import('./weapons').WeaponInfo} WeaponInfo */
/** @typedef {import('./json').OneOrMoreTextNodes} OneOrMoreTextNodes */

import { mustBeDefined } from '../utils.js'
import {
	extractArtifactMainStatAdvices,
	extractArtifactRefsGroups,
	extractArtifactSubStatAdvices,
} from './artifacts.js'
import { parseNotesLine } from './common.js'
import {
	json_extractText,
	json_findCellIndex,
	json_getText,
	json_getTextLines,
	json_mustFindCellIndex,
} from './json.js'
import { extractWeaponRefs } from './weapons.js'

/**
 * @typedef {{
 *   code: string,
 *   isBest: boolean,
 *   weapons: import('./weapons').WeaponRefs,
 *   artifacts: import('./artifacts').ArtifactRefs,
 *   mainStats: import('./artifacts').ArtifactMainStatAdvices,
 *   subStats: import('./artifacts').ArtifactSubStatAdvices,
 *   talent: TalentAdvices,
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

/** @typedef {'attack'|'skill'|'burst'} TalentCode */
/** @typedef {{advices:(TalentCode|TalentCode[])[]} & import('./common').BottomNotes} TalentAdvices */

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
						json_getTextLines(cells[charBlock.ext.artifactCol]),
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
							json_getTextLines(cells[charBlock.ext.weaponCol]),
							code2weapon,
							charBlock.buildInfo.code,
							fixes,
						),
						artifacts: firstAtrGroup.refs,
						mainStats: extractArtifactMainStatAdvices(
							json_getTextLines(cells[charBlock.ext.mainStatsCol]),
							charBlock.buildInfo.code,
							fixes,
						),
						subStats: extractArtifactSubStatAdvices(
							json_getTextLines(cells[charBlock.ext.subStatsCol]),
							charBlock.buildInfo.code,
							fixes,
						),
						talent: extractTalentAdvices(
							json_getTextLines(cells[charBlock.talentCol]),
							charBlock.buildInfo.code,
							fixes,
						),
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

/**
 * @param {string[]} lines
 * @param {string} characterCode
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {TalentAdvices}
 */
function extractTalentAdvices(lines, characterCode, fixes) {
	/** @type {TalentAdvices} */
	const advices = { advices: [], notes: null, seeCharNotes: false }

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		let m
		if ((m = line.match(/^\d\.(.*)$/i)) !== null) {
			const parts = m[1].toLocaleLowerCase().split(/[/=]/)
			const codes = /**@type {TalentCode[]}*/ ([])
			for (const part of parts) {
				let code = part.trim().replace('normal attack', 'attack')
				if (code.endsWith('*')) {
					advices.seeCharNotes = true
					code = code.slice(0, -1)
				}
				if (code === 'attack' || code === 'skill' || code === 'burst') codes.push(code)
				else
					console.warn(
						`WARN: unexpected talent '${part}' ('${code}') of character '${characterCode}'`,
					)
			}
			advices.advices.push(codes.length === 1 ? codes[0] : codes)
		} else {
			parseNotesLine(line, advices)
		}
	}
	return advices
}
