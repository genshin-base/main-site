import { getCharacterCodeFromName } from '#lib/genshin.js'
import { mustBeDefined, mustBeNotNull } from '#lib/utils/values.js'
import { warn } from '#lib/utils/logs.js'
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
} from './text-json.js'
import { extractWeaponRefs } from './weapons.js'
import { getCharacterBuildFormattedBlocks } from './build_texts.js'
import { walkTextNodes } from './text.js'

/**
 * @typedef {{
 *   buildInfo: import('./types').CharacterBuildInfo<'monolang'>,
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

 * @param {import('./fixes').HelperteamFixes} fixes
 * @returns {import('./types').CharacterBuildInfo<'monolang'>[]}
 */
export function json_processElementTable(sheet, elementCode, knownCodes, fixes) {
	const characters = /**@type {import('./types').CharacterBuildInfo<'monolang'>[]}*/ ([])
	let charBlock = /**@type {CharacterBlock|null}*/ (null)
	function applyCharBlockUnlessEmpty() {
		if (charBlock !== null) {
			const roles = charBlock.buildInfo.roles
			if (roles.length > 0 && !roles.some(x => x.isRecommended)) {
				const firstRole = roles[0]
				warn(`no recommended roles for character '${charBlock.buildInfo.code}', setting '${firstRole.code}' as recommended`) //prettier-ignore
				firstRole.isRecommended = true
			}
			characters.push(charBlock.buildInfo)
		}
		charBlock = null
	}

	for (const { values: cells = [] } of sheet.data[0].rowData) {
		if (json_findCellIndex(cells, /^(?:artifact stats|stats priority)$/) !== -1) {
			// первая строка заголовка таблицы персонажа
			applyCharBlockUnlessEmpty()
			const nameCol = cells.findIndex(x => json_getText(x) !== '')
			let code = getCharacterCodeFromName(json_getText(cells[nameCol]))
			code = code.replace(/-\(wip\)$/i, '') //code-wip -> code
			if (code === 'traveler') code = 'traveler-' + elementCode
			charBlock = {
				buildInfo: { code, elementCode, roles: [], credits: null },
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
					const roleCode = makeRoleCode(roleName.replace(/[⭐✩☆]/, ''))
					for (const group of artGroups)
						if (group.title) charBlock.roleCode2original[makeRoleCode(group.title)] = roleCode

					const firstAtrGroup = mustBeDefined(artGroups.pop())
					/** @type {import('./types').CharacterBuildInfoRole<'monolang'>} */
					const role = {
						code: makeRoleCode(firstAtrGroup.title ?? roleCode),
						name: makeRoleCode(firstAtrGroup.title ?? roleCode),
						isRecommended: /[⭐✩☆]/.test(roleName),
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
						tips: nullIfBlank(json_extractText(cells[charBlock.tipsCol])),
						notes: null,
					}

					charBlock.buildInfo.roles.push(role)
					for (const artGroup of artGroups) {
						/** @type {import('./types').CharacterBuildInfoRole<'monolang'>} */
						const copy = JSON.parse(JSON.stringify(role))
						copy.code = makeRoleCode(artGroup.title ?? '#' + artGroups.indexOf(artGroup))
						copy.name = copy.code
						copy.artifacts = artGroup.advices
						charBlock.buildInfo.roles.push(copy)
					}
				}
			}
		}
	}

	return characters
}

/** @param {import('./types').CharacterBuildInfo<'monolang'>} character */
export function getCharacterWeaponCodes(character) {
	const codes = /**@type {Set<string>}*/ (new Set())

	for (const role of character.roles)
		for (const ref of role.weapons.advices)
			for (const similar of ref.similar) {
				codes.add(similar.code)
			}
	for (const node of getCharacterTextNodes(character))
		if ('weapon' in node) {
			codes.add(node.code)
		}

	return [...codes]
}
/**
 * Первые два каждой рарности из рекомендованных билдов.
 * @param {import('./types').CharacterBuildInfo<unknown>} character
 * @param {import('#lib/parsing').Code2WeaponData} code2weapon
 */
export function getCharacterRecommendedWeaponCodes(character, code2weapon) {
	const codes = /**@type {Set<string>}*/ (new Set())

	for (const role of character.roles) {
		if (!role.isRecommended) continue

		/** @type {Partial<Record<import('#lib/genshin').GI_RarityCode, number>>} */
		let rarityCounts = {}

		for (const ref of role.weapons.advices) {
			// Увеличиваем счётчики рарностей здесь, количества проверяем в rarityCounts,
			// чтоб в случае рекомендаций типа `1.A 2.B/C 3.D` были выбраны A, B и C, а не только A и B.
			const newRarityCounts = Object.assign({}, rarityCounts)
			for (const similar of ref.similar) {
				const rarity = code2weapon[similar.code]?.rarity ?? 5
				if (!(similar.code in code2weapon))
					warn(`unknown weapon '${similar.code}', using default rarity ${rarity}`)

				const count = rarityCounts[rarity] ?? 0
				if (count >= 2) continue
				newRarityCounts[rarity] = count + 1

				codes.add(similar.code)
			}
			rarityCounts = newRarityCounts
		}
	}
	return [...codes]
}

/**
 * @param {import('./types').CharacterBuildInfo<'monolang'>} character
 * @param {import('#lib/parsing').ArtifcatSetGroupsCodes|null} artGroupCodes
 * @returns {string[]}
 */
export function getCharacterArtifactCodes(character, artGroupCodes) {
	const codes = /**@type {Set<string>}*/ (new Set())

	for (const role of character.roles)
		for (const set of role.artifacts.sets) {
			for (const art of getArtCodesInSet(set.arts, artGroupCodes)) codes.add(art.code)
		}
	for (const node of getCharacterTextNodes(character))
		if ('artifact' in node)
			for (const code of getArtCodeWithInner(node.code, artGroupCodes)) {
				codes.add(code)
			}

	return [...codes]
}
/**
 * Первое место из рекомендованных билдов.
 * @param {import('./types').CharacterBuildInfo<unknown>} character
 * @param {import('#lib/parsing').ArtifcatSetGroupsCodes} artGroupCodes
 * @returns {{code:string, count:number}[]}
 */
export function getCharacterRecommendedArtifactCodesWithCoutns(character, artGroupCodes) {
	const code2count = /**@type {Map<string, number>}*/ (new Map())

	for (const role of character.roles) {
		if (!role.isRecommended) continue

		const set = role.artifacts.sets.at(0)
		if (set) {
			for (const art of getArtCodesInSet(set.arts, artGroupCodes)) {
				const curCount = code2count.get(art.code) ?? 0
				code2count.set(art.code, Math.max(art.count, curCount))
			}
		}
	}

	return Array.from(code2count.entries(), ([code, count]) => ({ code, count }))
}
/**
 * @param {import('./types').ArtifactRef | import('./types').ArtifactRefNode} arts
 * @param {import('#lib/parsing').ArtifcatSetGroupsCodes|null} artGroupCodes
 * @returns {Generator<{code:string, count:number}, void, void>}
 */
function* getArtCodesInSet(arts, artGroupCodes) {
	yield* (void 0, //иначе следующий камент с типом уезжает вверх и перестаёт учитываться
	/**@returns {Generator<{code:string, count:number}, void, void>}*/
	function* iter(node) {
		if ('code' in node) {
			for (const code of getArtCodeWithInner(node.code, artGroupCodes))
				yield { code, count: node.count }
		} else {
			for (const art of node.arts) yield* iter(art)
		}
	})(arts)
}
/**
 * @param {string} code
 * @param {import('#lib/parsing').ArtifcatSetGroupsCodes|null} artGroupCodes
 */
function* getArtCodeWithInner(code, artGroupCodes) {
	yield code
	if (artGroupCodes && code in artGroupCodes) {
		for (const innerCode of artGroupCodes[code]) yield innerCode
	}
}

/** @type {import('./text-json').TextPreprocessFunc} */
function cleanupRoleCredits(text, formatRuns) {
	text = text.replace(/\n/g, ' ') //нельзя менять длину
	formatRuns = formatRuns.map(x => (hasUndBold(x.format) ? { ...x, format: withoutUndBold(x.format) } : x))
	return [text, formatRuns]
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
 * @returns {import('./types').TalentAdvices<'monolang'>}
 */
function extractTalentAdvices(lines, characterCode, fixes) {
	/** @type {import('./types').TalentAdvices<'monolang'>} */
	const advices = { advices: [], notes: null, seeCharNotes: false }

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		let m
		if ((m = line.match(/^\d\.(.*)$/i)) !== null) {
			const parts = m[1].toLocaleLowerCase().split(/[/=]/)
			const codes = /**@type {import('./types').GI_TalentCode[]}*/ ([])
			for (const part of parts) {
				let code = part.trim().replace(/normal attacks?/, 'attack')
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

	if (advices.advices.length === 0 && !advices.notes)
		warn(`character '${characterCode}': no talent priority advices`)
	return advices
}

/**
 * @param {CharacterBlock} charBlock
 * @param {import('#lib/google').CellData} notesCell
 * @param {import('./fixes').HelperteamFixes} fixes
 */
function extractAndApplyRolesNotes(charBlock, notesCell, fixes) {
	const text = json_getText(notesCell)
	/**
	 * @type {{
	 *   start: number,
	 *   len: number,
	 *   title: string,
	 *   roles: import('./types').CharacterBuildInfoRole<'monolang'>[]
	 * }[]}
	 */
	const matches = []

	// ищем все названия ролей в тексте заметок (notes) персонажа
	for (const role of charBlock.buildInfo.roles) {
		let title = charBlock.roleCode2original[role.code] ?? role.code

		// 'SHIELD SUPPORT [C4+ REQUIRED]' > 'SHIELD SUPPORT'
		// 'DPS (smth)' -> 'DPS'
		title = mustBeNotNull(title.match(/^([^[(]*)/))[0]
		title = title.replace(/\s+/g, ' ')
		title = title.trim()

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

	// делим заметки на части, каждую часть отправляем в соотв.роль
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
	} else if (text.trim() !== '') {
		warn(`character '${charBlock.buildInfo.code}' has no roles, build notes are ignored`)
	}
}

/** @param {import('./text').CompactTextParagraphs} paragraphs */
function nullIfBlank(paragraphs) {
	return Array.isArray(paragraphs) && paragraphs.length === 0 ? null : paragraphs
}

/** @param {import('./types').CharacterBuildInfo<'monolang'>} character */
function* getCharacterTextNodes(character) {
	for (const [text] of getCharacterBuildFormattedBlocks(character))
		if (text !== null)
			for (const node of walkTextNodes(text))
				if (typeof node !== 'string') {
					yield node
				}
}
