import {
	ART_GROUP_15_HEAL_CODE,
	ART_GROUP_18_ATK_CODE,
	ART_GROUP_20_ER_CODE,
	ART_GROUP_25_PH_ATK_CODE,
	ART_GROUP_80_EM_CODE,
	getArtifactCodeFromName,
} from '#lib/genshin.js'
import { warn } from '#lib/utils/logs.js'
import { parseNotesLine, tryFixCode } from './common.js'
import { statTextToCodeChecked } from '#lib/parsing/stats.js'
import { appendTextAsStringOrP, getTextLength, prependTextIntoP } from './text.js'
import { forEachNonBlank } from '#lib/utils/strings.js'

/** @type {import('./types').ArtifactRef} */
const DUMMY_ART_REF = { code: '', count: -1 }

/**
 * @param {string[]} lines
 * @param {import('./common').TrigramCodesSearcher} codeSearcher
 * @param {string} characterCode
 * @param {import('./fixes.js').HelperteamFixes} fixes
 * @returns {import('./types').ArtifactAdviceGroup<'monolang'>[]}
 */
export function extractArtifactRefsGroups(lines, codeSearcher, characterCode, fixes) {
	const artAdviceGroups = /**@type {import('./types').ArtifactAdviceGroup<'monolang'>[]}*/ ([])

	function warnOnCharacter(msg) {
		warn(`character '${characterCode}': ${msg}`)
	}

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		function warnOnLine(msg) {
			warnOnCharacter(`${msg} in line '${line}'`)
		}

		const m = line.match(/^\d+\.\s*(.*)$/)
		if (m) {
			const artSetAdvice = /**@type {import('./types').ArtifactSetAdvice<'monolang'>}*/ ({
				arts: DUMMY_ART_REF,
				notes: null,
				seeCharNotes: false,
			})
			let text = m[1]
			while (true) {
				text = text.trim()
				if (!text) break

				const m = text.match(/^(\/)?[+,]?(.*?)(?:\((\d+)\)|(?=\/))/)
				if (!m) break
				const newArtsText = text.slice(m[0].length).trim()

				const orWithPrev = m[1] !== undefined
				const name = m[2].trim()
				const count = parseInt(m[3], 10)
				const orWithNext = newArtsText.startsWith('/')
				if (isNaN(count) && !orWithNext) break
				text = newArtsText

				if (!isNaN(count) && count !== 2 && count !== 4) warnOnLine(`wrong arts count ${count}`)

				let code
				if (/\+?18%?atkset/i.test(name.replace(/\s/g, ''))) {
					code = ART_GROUP_18_ATK_CODE
				} else if (/^20% (er|energy recharge) set$/i.test(name)) {
					code = ART_GROUP_20_ER_CODE
				} else if (/^(physical dmg \+25% set|25% physical dmg set)$/i.test(name)) {
					code = ART_GROUP_25_PH_ATK_CODE
				} else if (/^\+?80 (em|elemental mastery) set$/i.test(name)) {
					code = ART_GROUP_80_EM_CODE
				} else if (/^15% healing bonus set$/i.test(name)) {
					code = ART_GROUP_15_HEAL_CODE
				} else {
					const logPrefix = `${characterCode} artifacts`
					code = tryFixCode(codeSearcher, getArtifactCodeFromName(name), logPrefix)
				}
				addArtToTree(artSetAdvice, orWithPrev ? 'or' : 'and', { code, count }, msg => warnOnLine(msg))
			}

			// проверяем остальной текст в строке, обычно это "*" и "см. заметки"
			while (text) {
				let m
				if (text.startsWith('*')) {
					artSetAdvice.seeCharNotes = true
					text = text.slice(1).trim()
				} else if ((m = text.match(/^SEE NOTES BELOW/i)) !== null) {
					artSetAdvice.seeCharNotes = true
					text = text.slice(m[0].length).trim()
				} else if ((m = text.match(/^\[choose two\]/i)) !== null) {
					// ignoring
					text = text.slice(m[0].length).trim()
				} else {
					warnOnLine(`unexpected line remainder '${text}'`)
					break
				}
			}

			if (artSetAdvice.arts === DUMMY_ART_REF) {
				warnOnLine(`no arts found`)
			} else {
				if (artAdviceGroups.length === 0)
					artAdviceGroups.push({
						title: null,
						advices: { sets: [], notes: null, seeCharNotes: false },
					})
				artAdviceGroups.at(-1)?.advices.sets.push(artSetAdvice)
			}
		} else {
			if (line.endsWith(':')) {
				const title = line.slice(0, -1).trim()
				artAdviceGroups.push({ title, advices: { sets: [], notes: null, seeCharNotes: false } })
			} else {
				const lastGroup = artAdviceGroups.at(-1)
				if (lastGroup) {
					parseNotesLine(line, lastGroup.advices, rem =>
						// it's for previous art, ignoring
						/^\[choose two\]$/i.test(rem) ? '' : null,
					)
				} else warnOnLine('artifact notes before any artifact data')
			}
		}
	}

	// проверка количества артефактов в наборах
	for (const group of artAdviceGroups)
		for (const set of group.advices.sets) {
			const setStr = () => artTreeToString(set.arts, true)
			/**
			 * @param {import('./types').ArtifactRef|import('./types').ArtifactRefNode} node
			 * @returns {number}
			 */
			function checkCounts(node) {
				if ('code' in node) {
					if (isNaN(node.count))
						warnOnCharacter(`'${node.code}' count is still NaN after arts parsing (${setStr()})`)
					return node.count
				} else if (node.op === 'and') {
					return node.arts.map(checkCounts).reduce((a, b) => a + b)
				} else if (node.op === 'or') {
					const counts = Array.from(new Set(node.arts.map(checkCounts)))
					if (counts.length > 1)
						warnOnCharacter(`different OR-arts counts: ${counts} (${setStr()})`)
					return counts[0]
				} else {
					throw new Error('should be unreachable')
				}
			}
			const total = checkCounts(set.arts)
			const expectedCounts =
				'op' in set.arts && set.arts.op === 'or' //
					? [2, 4]
					: [4]
			if (!expectedCounts.includes(total))
				warnOnCharacter(`arts total count ${total} != ${expectedCounts} (${setStr()})`)
		}

	// для новых персонажей (персонаж уже добавлен, но ячейки не заполнены)
	if (artAdviceGroups.length === 0) {
		warnOnCharacter(`no artifact advices`)
		artAdviceGroups.push({
			title: null,
			advices: { sets: [], notes: null, seeCharNotes: false },
		})
	}
	return artAdviceGroups
}

/**
 * @param {string[]} lines
 * @param {string} characterCode
 * @param {import('./fixes.js').HelperteamFixes} fixes
 * @returns {import('./types').ArtifactMainStatAdvices<'monolang'>}
 */
export function extractArtifactMainStatAdvices(lines, characterCode, fixes) {
	/** @type {import('./types').ArtifactMainStatAdvices<'monolang'>} */
	const advices = {
		circlet: { codes: [], notes: null, seeCharNotes: false },
		goblet: { codes: [], notes: null, seeCharNotes: false },
		sands: { codes: [], notes: null, seeCharNotes: false },
		notes: null,
		seeCharNotes: false,
	}

	/**
	 * @param {string} type
	 * @param {import('./types').ArtifactStatAdvice<"monolang">} advice
	 */
	const transferLongNotes_ = (type, advice) => transferLongNotes(advices, { b: type + ': ' }, advice)

	let last = /**@type {{type:String, advice:import('./types').ArtifactStatAdvice<"monolang">}|null}*/ (null)
	forEachNonBlank(lines, (line, prevWasBlank) => {
		let m
		if ((m = line.match(/^(circlet|goblet|sands)\s*[-:](.*)$/i)) !== null) {
			const type = m[1].toLocaleLowerCase()
			const advice = parseMatchedBonusLine(m[2], characterCode)
			transferLongNotes_(type, advice)
			advices[type] = advice
			last = { type, advice }
		} else {
			const dest = !prevWasBlank && last && !last.advice.notes ? last.advice : advices
			parseNotesLine(line, dest)
			if (last) transferLongNotes_(last.type, last.advice)
		}
	})

	for (const type of /**@type {const}*/ (['circlet', 'goblet', 'sands']))
		if (advices[type].codes.length === 0)
			warn(`character '${characterCode}': no ${type} main stats advices`)
	return advices
}

/**
 * @param {string[]} lines
 * @param {string} characterCode
 * @param {import('./fixes.js').HelperteamFixes} fixes
 * @returns {import('./types').ArtifactSubStatAdvices<'monolang'>}
 */
export function extractArtifactSubStatAdvices(lines, characterCode, fixes) {
	/** @type {import('./types').ArtifactSubStatAdvices<'monolang'>} */
	const advices = { advices: [], notes: null, seeCharNotes: false }

	/** @param {import('./types').ArtifactStatAdvice<"monolang">} advice */
	const transferLongNotes_ = advice =>
		transferLongNotes(advices, { b: advice.codes.join(', ') + ': ' }, advice)

	forEachNonBlank(lines, (line, prevWasBlank) => {
		let m
		if ((m = line.match(/^\d\.(.*)$/i)) !== null) {
			const advice = parseMatchedBonusLine(m[1], characterCode)
			transferLongNotes_(advice)
			advices.advices.push(advice)
		} else {
			const lastAdvice = advices.advices.at(-1)
			const dest = !prevWasBlank && lastAdvice && !lastAdvice.notes ? lastAdvice : advices
			parseNotesLine(line, dest)
			if (lastAdvice) transferLongNotes_(lastAdvice)
		}
	})

	if (advices.advices.length === 0) warn(`character '${characterCode}': no artifact sub stats advices`)
	return advices
}

/**
 * @param {{notes:import('./text').CompactTextParagraphs|null}} destObj
 * @param {import('./text').OneOrMoreInlineTextNodes} prefix
 * @param {{notes:import('./text').CompactTextParagraphs|null}} srcObj
 */
function transferLongNotes(destObj, prefix, srcObj) {
	if (!srcObj.notes || getTextLength(srcObj.notes) < 40) return
	destObj.notes = appendTextAsStringOrP(destObj.notes, prependTextIntoP(prefix, srcObj.notes))
	srcObj.notes = null
}

/**
 * @param {string} bonusesText
 * @param {string} characterCode
 * @returns {import('./types').ArtifactStatAdvice<'monolang'>}
 */
function parseMatchedBonusLine(bonusesText, characterCode) {
	const codes = []
	let notes = /**@type {import('./types').ArtifactStatAdvice<'monolang'>["notes"]}*/ (null)
	let seeCharNotes = false

	function cutToNotes(m, cut) {
		notes = appendTextAsStringOrP(notes, cut.trim())
		return ''
	}
	bonusesText = bonusesText.replace(/\(([^\)]+)\)/, cutToNotes) // 'dmg (bla bla)'
	bonusesText = bonusesText.replace(/\s\*(\w.*)$/, cutToNotes) // 'dmg *bla bla'

	const bonuses = bonusesText
		.toLocaleLowerCase()
		.split('/')
		.map(x => x.trim())
	for (let bonus of bonuses) {
		const m = bonus.match(/\*+$/)
		if (m !== null) {
			bonus = bonus.slice(0, -m[0].length)
			seeCharNotes = true
		}
		codes.push(statTextToCodeChecked(bonus, `of character '${characterCode}'`))
	}
	// "Crit Rate / DMG" должен парситься как "crit-rate, crit-dmg" (а не "crit-rate, dmg")
	for (let i = 1; i < codes.length; i++)
		if (codes[i - 1] === 'crit-rate' && codes[i] === 'dmg') {
			codes[i] = 'crit-dmg'
			break
		}

	return { codes, notes, seeCharNotes }
}

/**
 * @param {import('./types').ArtifactSetAdvice<'monolang'>} setAdvice
 * @param {'and'|'or'} op
 * @param {import('./types').ArtifactRef} art
 * @param {(msg:string) => unknown} onWarn
 */
function addArtToTree(setAdvice, op, art, onWarn) {
	if (setAdvice.arts === DUMMY_ART_REF) {
		setAdvice.arts = art
		if (op === 'or') onWarn(`can not 'or' with dummy art`)
	} else if ('code' in setAdvice.arts) {
		setAdvice.arts = { op, arts: [setAdvice.arts, art] }
		tryFixArtCounts(setAdvice.arts.arts, op)
	} else if (setAdvice.arts.op !== op) {
		const allCount = getArtTreeCount([setAdvice.arts], 'or')
		if (allCount === art.count) {
			setAdvice.arts = { op, arts: [setAdvice.arts, art] }
			tryFixArtCounts(setAdvice.arts.arts, op)
		} else {
			/** @param {import('./types').ArtifactRefNode} node */
			;(function addToLast(node) {
				const lastI = node.arts.length - 1
				const last = node.arts[lastI]
				if ('code' in last) {
					node.arts[lastI] = { op, arts: [last, art] }
					tryFixArtCounts([last, art], op)
				} else if (last.op === op) {
					last.arts.push(art)
					tryFixArtCounts(last.arts, op)
				} else {
					addToLast(last)
				}
			})(setAdvice.arts)
		}
	} else if (setAdvice.arts.op === op) {
		setAdvice.arts.arts.push(art)
		tryFixArtCounts(setAdvice.arts.arts, op)
	} else {
		throw new Error('should be unreachable')
	}
}
/**
 * @param {(import('./types').ArtifactRef|import('./types').ArtifactRefNode)[]} roots
 * @param {'and'|'or'} op
 */
function getArtTreeCount(roots, op) {
	if (op === 'or') {
		for (const root of roots) {
			if ('code' in root && !isNaN(root.count)) return root.count
			if ('op' in root) {
				const childCount = getArtTreeCount(root.arts, root.op)
				if (!isNaN(childCount)) return childCount
			}
		}
		return NaN
	} else {
		let sum = 0
		for (const root of roots) {
			if ('code' in root) sum += root.count
			if ('op' in root) sum += getArtTreeCount(root.arts, root.op)
		}
		return sum
	}
}
/**
 * @param {(import('./types').ArtifactRef|import('./types').ArtifactRefNode)[]} roots
 * @param {'and'|'or'} op
 */
function tryFixArtCounts(roots, op) {
	if (op !== 'or') return
	const count = getArtTreeCount(roots, 'or')
	if (!isNaN(count)) for (const root of roots) if ('code' in root) root.count = count
}
/**
 * @param {import('./types').ArtifactRef|import('./types').ArtifactRefNode} root
 * @param {boolean} [noOuterBrackets]
 */
function artTreeToString(root, noOuterBrackets) {
	if ('code' in root) return `${root.code}:${root.count}`
	let childrenStr = root.arts.map(x => artTreeToString(x)).join(` ${root.op.toLocaleUpperCase()} `)
	if (!noOuterBrackets) childrenStr = '(' + childrenStr + ')'
	return childrenStr
}
