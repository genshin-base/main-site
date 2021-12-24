import { getCharacterCodeFromName } from '#lib/genshin.js'
import { mustBeDefined, warn } from '#lib/utils.js'
import {
	extractArtifactMainStatAdvices,
	extractArtifactRefsGroups,
	extractArtifactSubStatAdvices,
} from './artifacts.js'
import { getLangValue, parseNotesLine } from './common.js'
import {
	json_extractText,
	json_findCellIndex,
	json_getText,
	json_getTextLines,
	json_mustFindCellIndex,
} from './json.js'
import { extractWeaponRefs, getWeaponTypeCode } from './weapons.js'

/** @typedef {import('./artifacts').ArtifactInfo} ArtifactInfo */
/** @typedef {import('./weapons').WeaponInfo} WeaponInfo */
/** @typedef {import('./json').OneOrMoreTextNodes} OneOrMoreTextNodes */

/**
 * @typedef {{
 *   code: string,
 *   isRecommended: boolean,
 *   weapons: import('./weapons').WeaponAdvices,
 *   artifacts: import('./artifacts').ArtifactSetAdvices,
 *   mainStats: import('./artifacts').ArtifactMainStatAdvices,
 *   subStats: import('./artifacts').ArtifactSubStatAdvices,
 *   talents: TalentAdvices,
 *   tips: OneOrMoreTextNodes,
 * }} CharacterBuildInfoRole
 */

/**
 * @typedef {{
 *   code: string
 *   elementCode: import('#lib/genshin').GI_ElementCode,
 *   weaponTypeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   roles: CharacterBuildInfoRole[],
 *   notes: OneOrMoreTextNodes|null,
 *   credits: OneOrMoreTextNodes|null,
 * }} CharacterBuildInfo
 */

/** @typedef {'attack'|'skill'|'burst'} TalentCode */
/** @typedef {{advices:(TalentCode|TalentCode[])[]} & import('./common').BottomNotes} TalentAdvices */

/**
 * @typedef {{
 *   code: string
 *   elementCode: import('#lib/genshin').GI_ElementCode,
 *   weaponTypeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   rarity: import('#lib/genshin').GI_RarityCode,
 * }} CharacterShortInfo
 */

/**
 * @typedef {{
 *   character: CharacterBuildInfo & {name:string, rarity},
 *   artifacts: import('./artifacts').ArtifactFullInfo[],
 *   weapons: import('./weapons').WeaponFullInfo[],
 * }} CharacterFullInfo
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
 * @param {import('#lib/google').Sheet} sheet
 * @param {import('#lib/genshin').GI_ElementCode} elementCode
 * @param {import('./common').KnownItemCodes} knownCodes
 * @param {Map<string,import('#lib/genshin').GI_WeaponTypeCode>} weaponCode2typeCode
 * @param {import('./fixes').HelperteamFixes} fixes
 * @returns {CharacterBuildInfo[]}
 */
export function json_processElementTable(sheet, elementCode, knownCodes, weaponCode2typeCode, fixes) {
	const characters = /**@type {CharacterBuildInfo[]}*/ ([])
	let charBlock = /**@type {CharacterBlock|null}*/ (null)
	function applyCharBlockUnlessEmpty() {
		if (charBlock !== null) {
			const build = charBlock.buildInfo
			build.weaponTypeCode = getWeaponTypeCode(
				build.roles.map(x => x.weapons),
				weaponCode2typeCode,
				build.code,
			)
			characters.push(build)
		}
		charBlock = null
	}

	for (const { values: cells = [] } of sheet.data[0].rowData) {
		if (json_findCellIndex(cells, /^(?:artifact stats|stats priority)$/) !== -1) {
			applyCharBlockUnlessEmpty()
			const nameCol = cells.findIndex(x => json_getText(x) !== '')
			const code = getCharacterCodeFromName(json_getText(cells[nameCol]))
			charBlock = {
				buildInfo: {
					code,
					elementCode,
					weaponTypeCode: 'claymore',
					roles: [],
					notes: null,
					credits: null,
				},
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
			let m
			if ((m = firstCellText.match(/^(notes\s*)([\d\D]*)$/i)) !== null) {
				charBlock.buildInfo.notes = json_extractText(cells[charBlock.nameCol + 1])
				const [, prefix, suffix] = m
				if (suffix.trim() !== '') {
					const cell = cells[charBlock.nameCol]
					charBlock.buildInfo.credits = json_extractText(cell, prefix.length, cleanupRoleCredits)
				}
				applyCharBlockUnlessEmpty()
			} else {
				const roleName = json_getText(cells[charBlock.roleCol]).trim()
				if (roleName !== '') {
					const artGroups = extractArtifactRefsGroups(
						json_getTextLines(cells[charBlock.ext.artifactCol]),
						knownCodes.artifacts,
						charBlock.buildInfo.code,
						fixes,
					)
					const firstAtrGroup = mustBeDefined(artGroups.pop())
					/** @type {CharacterBuildInfoRole} */
					const role = {
						code: (
							firstAtrGroup.title ?? roleName.replace(/[⭐✩]/, '').trim()
						).toLocaleLowerCase(),
						isRecommended: roleName.includes('⭐') || roleName.includes('✩'),
						weapons: extractWeaponRefs(
							json_getTextLines(cells[charBlock.ext.weaponCol]),
							knownCodes.weapons,
							charBlock.buildInfo.code,
							fixes,
						),
						artifacts: firstAtrGroup.advices,
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
						talents: extractTalentAdvices(
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
						copy.artifacts = artGroup.advices
						charBlock.buildInfo.roles.push(copy)
					}
				}
			}
		}
	}

	return characters
}

/**
 * @param {CharacterBuildInfo[]} buildCharacters
 * @param {import('#lib/parsing').CharactersInfo} charactersInfo
 * @returns {CharacterShortInfo[]}
 */
export function makeCharacterShortList(buildCharacters, charactersInfo) {
	function getRarity(code) {
		const info = charactersInfo[code]
		if (info) return info.rarity
		const def = 5
		warn(`can not find character '${code}' rarity, using '${def}'`)
		return def
	}
	return buildCharacters.map(x => ({
		code: x.code,
		elementCode: x.elementCode,
		weaponTypeCode: x.weaponTypeCode,
		rarity: getRarity(x.code),
	}))
}

/** @param {CharacterBuildInfo} character */
export function* getCharacterWeaponCodes(character) {
	for (const role of character.roles)
		for (const ref of role.weapons.advices)
			for (const similar of ref.similar) {
				yield similar.code
			}
}

/** @param {CharacterBuildInfo} character */
export function* getCharacterArtifactCodes(character) {
	for (const role of character.roles)
		for (const set of role.artifacts.sets)
			yield* (function* iter(node) {
				if ('code' in node) yield node.code
				else for (const art of node.arts) iter(art)
			})(set.arts)
}

/**
 * @param {CharacterBuildInfo} character
 * @param {import('#lib/parsing').CharactersInfo} charactersInfo
 * @param {import('./artifacts').ArtifactFullInfo[]} artifacts
 * @param {import('./weapons').WeaponFullInfo[]} weapons
 * @param {string} lang
 * @returns {CharacterFullInfo}
 */
export function makeCharacterFullInfo(character, charactersInfo, artifacts, weapons, lang) {
	const weaponCodes = new Set(getCharacterWeaponCodes(character))
	const artifactCodes = new Set(getCharacterArtifactCodes(character))
	let name = character.code
	let rarity = /** @type {import('#lib/genshin').GI_RarityCode} */ (1)
	const info = charactersInfo[character.code]
	if (info) {
		name = getLangValue(info.name, lang, character.code, 'name', character.code)
		rarity = info.rarity
	} else {
		warn(`can not get character full info: '${character.code}' not found`)
	}
	return {
		character: Object.assign({ name, rarity }, character),
		weapons: weapons.filter(x => weaponCodes.has(x.code)),
		artifacts: artifacts.filter(x => artifactCodes.has(x.code)),
	}
}

/** @type {import('./json').TextPreprocessFunc} */
function cleanupRoleCredits(text, defaultFormat, formatRuns) {
	text = text.replace(/\n/g, ' ') //нельзя менять длину
	if (hasUndBold(defaultFormat)) defaultFormat = withoutUndBold(defaultFormat)
	formatRuns = formatRuns.map(x => (hasUndBold(x.format) ? { ...x, format: withoutUndBold(x.format) } : x))
	return [text, defaultFormat, formatRuns]
}
/** @param {import('#lib/google').TextFormat} format */
function hasUndBold(format) {
	return format.bold || format.underline
}
/** @param {import('#lib/google').TextFormat} format */
function withoutUndBold(format) {
	return { ...format, bold: false, underline: false }
}

/**
 * @param {string[]} lines
 * @param {string} characterCode
 * @param {import('./fixes.js').HelperteamFixes} fixes
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
				else warn(`unexpected talent '${part}' ('${code}') of character '${characterCode}'`)
			}
			advices.advices.push(codes.length === 1 ? codes[0] : codes)
		} else {
			parseNotesLine(line, advices)
		}
	}
	return advices
}
