import { getCharacterCodeFromName } from '#lib/genshin.js'
import { mustBeDefined, mustBeNotNull } from '#lib/utils/values.js'
import { warn } from '#lib/utils/logs.js'
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
/** @typedef {import('./text').CompactTextParagraphs} OneOrMoreTextNodes */

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
 *   notes: OneOrMoreTextNodes|null,
 * }} CharacterBuildInfoRole
 */

/**
 * @typedef {{
 *   code: string
 *   elementCode: import('#lib/genshin').GI_ElementCode,
 *   weaponTypeCode: import('#lib/genshin').GI_WeaponTypeCode,
 *   roles: CharacterBuildInfoRole[],
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
 *   character: CharacterBuildInfo & {name:string, rarity:import('#lib/genshin').GI_RarityCode},
 *   artifacts: import('./artifacts').ArtifactFullInfo[],
 *   weapons: import('./weapons').WeaponFullInfo[],
 * }} CharacterFullInfo
 */

/**
 * @typedef {{
 *   buildInfo: CharacterBuildInfo,
 *   roleCode2original: Record<string, string>,
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
			// первая строка заголовка таблицы персонажа
			applyCharBlockUnlessEmpty()
			const nameCol = cells.findIndex(x => json_getText(x) !== '')
			let code = getCharacterCodeFromName(json_getText(cells[nameCol]))
			if (code === 'traveler') code = elementCode + '-traveler'
			charBlock = {
				buildInfo: {
					code,
					elementCode,
					weaponTypeCode: 'claymore',
					roles: [],
					credits: null,
				},
				roleCode2original: {},
				nameCol,
				roleCol: json_mustFindCellIndex(cells, 'role'),
				talentCol: json_mustFindCellIndex(cells, 'talent priority'),
				tipsCol: json_mustFindCellIndex(cells, /ability tips?/),
				ext: null,
			}
		} else if (charBlock && !charBlock.ext && -1 !== json_findCellIndex(cells, /^main stats?$/)) {
			// вторая строка заголовка таблицы персонажа
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
				// последняя строка таблицы персонажа (заметки)
				extractAndApplyRolesNotes(charBlock, cells[charBlock.nameCol + 1], fixes)
				const [, prefix, suffix] = m
				if (suffix.trim() !== '') {
					const cell = cells[charBlock.nameCol]
					const credits = json_extractText(cell, prefix.length, null, cleanupRoleCredits)
					charBlock.buildInfo.credits = credits
				}
				applyCharBlockUnlessEmpty()
			} else {
				const roleName = json_getText(cells[charBlock.roleCol]).trim()
				if (roleName !== '') {
					// строка таблицы персонажа с инфой по билду (оружия, арты, ...)
					const artGroups = extractArtifactRefsGroups(
						json_getTextLines(cells[charBlock.ext.artifactCol]),
						knownCodes.artifacts,
						charBlock.buildInfo.code,
						fixes,
					)

					const makeRoleCode = (/**@type {string}*/ name) => name.trim().toLocaleLowerCase()
					const roleCode = makeRoleCode(roleName.replace(/[⭐✩]/, ''))
					for (const group of artGroups)
						if (group.title) charBlock.roleCode2original[makeRoleCode(group.title)] = roleCode

					const firstAtrGroup = mustBeDefined(artGroups.pop())
					/** @type {CharacterBuildInfoRole} */
					const role = {
						code: makeRoleCode(firstAtrGroup.title ?? roleCode),
						isRecommended: /[⭐✩]/.test(roleName),
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
						notes: null,
					}

					charBlock.buildInfo.roles.push(role)
					for (const artGroup of artGroups) {
						/** @type {CharacterBuildInfoRole} */
						const copy = JSON.parse(JSON.stringify(role))
						copy.code = makeRoleCode(artGroup.title ?? '#' + artGroups.indexOf(artGroup))
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
 * @param {import('#lib/parsing').Code2CharacterData} code2characterData
 * @returns {CharacterShortInfo[]}
 */
export function makeCharacterShortList(buildCharacters, code2characterData) {
	function getRarity(code) {
		const data = code2characterData[code]
		if (data) return data.rarity
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
 * @param {import('#lib/parsing').Code2CharacterData} code2characterData
 * @param {import('./artifacts').ArtifactFullInfo[]} artifacts
 * @param {import('./weapons').WeaponFullInfo[]} weapons
 * @param {string} lang
 * @returns {CharacterFullInfo}
 */
export function makeCharacterFullInfo(character, code2characterData, artifacts, weapons, lang) {
	const weaponCodes = new Set(getCharacterWeaponCodes(character))
	const artifactCodes = new Set(getCharacterArtifactCodes(character))

	let name = character.code
	let rarity = /** @type {import('#lib/genshin').GI_RarityCode} */ (1)
	const data = code2characterData[character.code]
	if (data) {
		name = getLangValue(data.name, lang, character.code, 'name', character.code)
		rarity = data.rarity
	} else {
		warn(`can not get character full info: '${character.code}' not found`)
	}
	const characterExt = Object.assign({ name, rarity }, character)
	characterExt.roles = characterExt.roles.slice().sort((a, b) => +b.isRecommended - +a.isRecommended)

	return {
		character: characterExt,
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
				if ((m = code.match(/\*+$/)) !== null) {
					advices.seeCharNotes = true
					code = code.slice(0, -m[0].length)
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

/**
 * @param {CharacterBlock} charBlock
 * @param {import('#lib/google').CellData} notesCell
 * @param {import('./fixes').HelperteamFixes} fixes
 */
function extractAndApplyRolesNotes(charBlock, notesCell, fixes) {
	const text = json_getText(notesCell) //.toLocaleLowerCase()
	const matches =
		/**@type {{start:number, len:number, title:string, roles:CharacterBuildInfoRole[]}[]}*/ ([])
	for (const role of charBlock.buildInfo.roles) {
		let title = charBlock.roleCode2original[role.code] ?? role.code

		// 'SHIELD SUPPORT [C4+ REQUIRED]' > 'SHIELD SUPPORT'
		title = mustBeNotNull(title.match(/^([^[(]*)/))[0].trim()

		const fix = fixes.roleNotes.find(x => x.character === charBlock.buildInfo.code && x.role === title)
		if (fix) {
			title = fix.searchAs
			fix._used = true
		}

		let m
		const titleRe = new RegExp('(?:^|\n) *' + title + ' *\n', 'i')
		const matchForSimilarRole = matches.find(x => x.title === title)
		if (matchForSimilarRole) {
			// нужно для фиксов, когда для двух ролей может понадобиться одно и то же описание
			matchForSimilarRole.roles.push(role)
		} else if ((m = text.match(titleRe)) !== null) {
			matches.push({ start: m.index ?? 0, len: m[0].length, title, roles: [role] })
		} else {
			warn(`can not find character '${charBlock.buildInfo.code}' build notes for role '${title}'`)
		}
	}

	if (matches.length > 0) {
		matches.sort((a, b) => a.start - b.start)
		for (let i = 0; i < matches.length; i++) {
			const startIndex = matches[i].start
			const titleEndIndex = startIndex + matches[i].len
			const blockEndIndex = matches[i + 1]?.start ?? text.length
			for (const role of matches[i].roles)
				role.notes = json_extractText(notesCell, titleEndIndex, blockEndIndex)
		}
	} else if (charBlock.buildInfo.roles.length > 0) {
		const roles = charBlock.buildInfo.roles
		const role = roles.find(x => x.isRecommended) ?? roles[0]
		warn(
			`found no place for character '${charBlock.buildInfo.code}' build notes, ` +
				`putting them to role '${role.code}'`,
		)
		role.notes = json_extractText(notesCell)
	} else {
		warn(`character '${charBlock.buildInfo.code}' has not roles, build notes are ignored`)
	}
}
