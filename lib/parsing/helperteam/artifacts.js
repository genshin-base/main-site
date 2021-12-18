import { getArtifactCodeFromName } from '#lib/genshin.js'
import { warn } from '#lib/utils.js'
import { addTextAsStringOrP, getCodeChecked, nameOrCode, parseNotesLine } from './common.js'
import { json_extractText, json_findCellIndex, json_getText, json_mustFindCellIndex } from './json.js'
import { statTextToCodeChecked } from './stats.js'

/** @typedef {import('./json').OneOrMoreTextNodes} OneOrMoreTextNodes */
/** @typedef {import('./common').BottomNotes} BottomNotes */

/**
 * @typedef {{
 *   code: string,
 *   sets: {'1':OneOrMoreTextNodes} | {'2':OneOrMoreTextNodes, '4':OneOrMoreTextNodes}
 * }} ArtifactInfo
 */

/** @typedef {{code:string, count:number}} ArtifactRef */

/** @typedef {{op:'and'|'or', arts:(ArtifactRef|ArtifactRefNode)[]}} ArtifactRefNode */

/** @typedef {{arts:ArtifactRef|ArtifactRefNode} & BottomNotes} ArtifactSetAdvice */

/** @typedef {{sets:ArtifactSetAdvice[]} & BottomNotes} ArtifactSetAdvices */

/** @typedef {{title:string|null, advices:ArtifactSetAdvices}} ArtifactAdviceGroup */

/** @typedef {{codes:string[]} & BottomNotes} ArtifactStatAdvice */
/** @typedef {{sands:ArtifactStatAdvice, goblet:ArtifactStatAdvice, circlet:ArtifactStatAdvice} & BottomNotes} ArtifactMainStatAdvices */

/** @typedef {{advices:ArtifactStatAdvice[]} & BottomNotes} ArtifactSubStatAdvices */

/** @typedef {ArtifactInfo & {name:string}} ArtifactFullInfo */

export const ART_GROUP_18_ATK_CODE = '18%-atk'
export const ART_GROUP_20_ER_CODE = '20%-er'

/** @type {ArtifactRef} */
const DUMMY_ART_REF = { code: '', count: -1 }

/**
 * @param {import('#lib/google').Sheet} sheet
 * @param {import('./common').TrigramCodesSearcher} knownCodes
 */
export function json_extractArtifactsInfo(sheet, knownCodes) {
	/**
	 * @typedef {{
	 *   nameCol: number,
	 *   ext: null | {oneCol:number} | {twoCol:number, fourCol:number}
	 * }} ArtifactBlock
	 */

	const artifacts = /**@type {ArtifactInfo[]}*/ ([])
	let curStars = /**@type {number|null}*/ (null)
	let artSetInfo = /**@type {ArtifactBlock|null}*/ (null)
	for (const { values: cells = [] } of sheet.data[0].rowData) {
		for (let i = 0; i < cells.length; i++) {
			const cell = cells[i]
			const text = json_getText(cell)
			const m = text && text.trim().match(/^(\d)\s*[⭐✩]\s*artifact 1?\s*sets/i)
			if (m) {
				curStars = parseInt(m[1], 10)
				artSetInfo = null
			}
		}

		if (curStars) {
			let _col
			if ((_col = json_findCellIndex(cells, /^artifact\s+set$/i)) !== -1) {
				artSetInfo = { nameCol: _col, ext: null }
				if ((_col = json_findCellIndex(cells, /^1 set bonuses$/i)) !== -1)
					artSetInfo.ext = { oneCol: _col }
			} else if (artSetInfo && !artSetInfo.ext) {
				artSetInfo.ext = {
					twoCol: json_mustFindCellIndex(cells, /^2\Dpieces$/i),
					fourCol: json_mustFindCellIndex(cells, /^4\Dpieces$/i),
				}
			} else if (artSetInfo?.ext && cells.length > artSetInfo.nameCol) {
				const name = json_getText(cells[artSetInfo.nameCol])
					.replace(/\s+/g, ' ')
					.trim()
					.toLocaleLowerCase()
				const sets =
					'oneCol' in artSetInfo.ext
						? { 1: json_extractText(cells[artSetInfo.ext.oneCol]) }
						: {
								2: json_extractText(cells[artSetInfo.ext.twoCol]),
								4: json_extractText(cells[artSetInfo.ext.fourCol]),
						  }
				if (name) {
					if ('1' in sets ? !sets[1] : !sets[2] || !sets[4])
						throw new Error(`empty bonus text for '${name}'`)
					const code = getCodeChecked(getArtifactCodeFromName, knownCodes, name)
					artifacts.push({ code, sets })
				}
			}
		}
	}
	return artifacts
}

/**
 * @param {string[]} lines
 * @param {import('./common').TrigramCodesSearcher} codeSearcher
 * @param {string} characterCode
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {ArtifactAdviceGroup[]}
 */
export function extractArtifactRefsGroups(lines, codeSearcher, characterCode, fixes) {
	const artAdviceGroups = /**@type {ArtifactAdviceGroup[]}*/ ([])

	function warnOnCharacter(msg) {
		warn(`${msg} of character '${characterCode}'`)
	}

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		function warnOnLine(msg) {
			warnOnCharacter(`${msg} in line '${line}'`)
		}

		const m = line.match(/^\d+\.\s*(.*)$/)
		if (m) {
			let artSetAdvice = /**@type {ArtifactSetAdvice}*/ ({
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
				if (/\+?18%atkset/i.test(name.replace(/\s/g, ''))) {
					code = ART_GROUP_18_ATK_CODE
				} else if (/\+?20%erset/i.test(name.replace(/\s/g, ''))) {
					code = ART_GROUP_20_ER_CODE
				} else {
					code = getCodeChecked(getArtifactCodeFromName, codeSearcher, name)
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
			 * @param {ArtifactRef|ArtifactRefNode} node
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

	return artAdviceGroups
}

/**
 * @param {string[]} lines
 * @param {string} characterCode
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {ArtifactMainStatAdvices}
 */
export function extractArtifactMainStatAdvices(lines, characterCode, fixes) {
	/** @type {ArtifactMainStatAdvices} */
	const advices = {
		circlet: { codes: [], notes: null, seeCharNotes: false },
		goblet: { codes: [], notes: null, seeCharNotes: false },
		sands: { codes: [], notes: null, seeCharNotes: false },
		notes: null,
		seeCharNotes: false,
	}

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		let m
		if ((m = line.match(/^(circlet|goblet|sands)\s*-(.*)$/i)) !== null) {
			const type = m[1].toLocaleLowerCase()
			advices[type] = parseMatchedBonusLine(m[2], characterCode)
		} else {
			parseNotesLine(line, advices)
		}
	}
	return advices
}

/**
 * @param {string[]} lines
 * @param {string} characterCode
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {ArtifactSubStatAdvices}
 */
export function extractArtifactSubStatAdvices(lines, characterCode, fixes) {
	/** @type {ArtifactSubStatAdvices} */
	const advices = { advices: [], notes: null, seeCharNotes: false }

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		let m
		if ((m = line.match(/^\d\.(.*)$/i)) !== null) {
			advices.advices.push(parseMatchedBonusLine(m[1], characterCode))
		} else {
			parseNotesLine(line, advices)
		}
	}
	return advices
}

/**
 * @param {ArtifactInfo} artifact
 * @param {import('#lib/parsing').ItemsLangNames} langNames
 * @param {string} lang
 * @returns {ArtifactFullInfo}
 */
export function makeArtifactFullInfo(artifact, langNames, lang) {
	let name = nameOrCode(artifact, langNames, lang)
	return Object.assign({ name }, artifact)
}

/**
 * @param {string} bonusesText
 * @param {string} characterCode
 * @returns {ArtifactStatAdvice}
 */
function parseMatchedBonusLine(bonusesText, characterCode) {
	const codes = []
	let notes = /**@type {ArtifactStatAdvice["notes"]}*/ (null)
	let seeCharNotes = false

	function cutToNotes(m, cut) {
		notes = addTextAsStringOrP(notes, cut.trim())
		return ''
	}
	bonusesText = bonusesText.replace(/\(([^\)]+)\)/, cutToNotes) // 'dmg (bla bla)'
	bonusesText = bonusesText.replace(/\s\*(\w.*)$/, cutToNotes) // 'dmg *bla bla'

	const bonuses = bonusesText
		.toLocaleLowerCase()
		.split('/')
		.map(x => x.trim())
	for (let bonus of bonuses) {
		if (bonus.endsWith('*')) {
			bonus = bonus.slice(0, -1)
			seeCharNotes = true
		}
		codes.push(statTextToCodeChecked(bonus, `of character '${characterCode}'`))
	}
	return { codes, notes, seeCharNotes }
}

/**
 * @param {ArtifactSetAdvice} setAdvice
 * @param {'and'|'or'} op
 * @param {ArtifactRef} art
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
			/** @param {ArtifactRefNode} node */
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
 * @param {(ArtifactRef|ArtifactRefNode)[]} roots
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
 * @param {(ArtifactRef|ArtifactRefNode)[]} roots
 * @param {'and'|'or'} op
 */
function tryFixArtCounts(roots, op) {
	if (op !== 'or') return
	const count = getArtTreeCount(roots, 'or')
	if (!isNaN(count)) for (const root of roots) if ('code' in root) root.count = count
}
/**
 * @param {ArtifactRef|ArtifactRefNode} root
 * @param {boolean} [noOuterBrackets]
 */
function artTreeToString(root, noOuterBrackets) {
	if ('code' in root) return `${root.code}:${root.count}`
	let childrenStr = root.arts.map(x => artTreeToString(x)).join(` ${root.op.toLocaleUpperCase()} `)
	if (!noOuterBrackets) childrenStr = '(' + childrenStr + ')'
	return childrenStr
}
