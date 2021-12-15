import { json_extractText, json_findCellIndex, json_getText, json_mustFindCellIndex } from './json.js'
import { statTextToCodeChecked } from './stats.js'

/** @typedef {import('./json').OneOrMoreTextNodes} OneOrMoreTextNodes */

/**
 * @typedef {{
 *   code: string,
 *   sets: {'1':OneOrMoreTextNodes} | {'2':OneOrMoreTextNodes, '4':OneOrMoreTextNodes}
 * }} ArtifactInfo
 */

/** @typedef {{code:string, count:number}} ArtifactRef */

/** @typedef {{op:'and'|'or', arts:(ArtifactRef|ArtifactRefNode)[]}} ArtifactRefNode */

/** @typedef {{arts:ArtifactRef|ArtifactRefNode, notes:string, seeCharNotes:boolean}} ArtifactRefSet */

/** @typedef {{sets:ArtifactRefSet[], notes:string, seeCharNotes:boolean}} ArtifactRefs */

/** @typedef {{title:string|null, refs:ArtifactRefs}} ArtifactRefsGroup */

/** @typedef {{codes:string[], notes:string, seeCharNotes:boolean}} ArtifactStatAdvice */
/** @typedef {{sands:ArtifactStatAdvice, goblet:ArtifactStatAdvice, circlet:ArtifactStatAdvice, notes:string, seeCharNotes:boolean}} ArtifactMainStatAdvices */

/** @typedef {{advices:ArtifactStatAdvice[], notes:string, seeCharNotes:boolean}} ArtifactSubStatAdvices */

export const ART_GROUP_18_ATK_CODE = '18%-atk'
export const ART_GROUP_20_ER_CODE = '20%-er'

/** @type {ArtifactRef} */
const DUMMY_ART_REF = { code: '', count: -1 }

/** @param {string} name */
export function getArtifactCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s/g, '-').replace(/'/g, '')
}

/** @param {import('../google').Sheet} sheet */
export function json_extractArtifactsInfo(sheet) {
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
			const m = text && text.trim().match(/^(\d)\s*⭐\s*artifact 1?\s*sets/i)
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
					const code = getArtifactCodeFromName(name)
					artifacts.push({ code, sets })
				}
			}
		}
	}
	return artifacts
}

/**
 * @param {string[]} lines
 * @param {Map<string,ArtifactInfo>} code2artifact
 * @param {string} characterCode
 * @param {import('./fixes.js').BuildsExtractionFixes} fixes
 * @returns {ArtifactRefsGroup[]}
 */
export function extractArtifactRefsGroups(lines, code2artifact, characterCode, fixes) {
	const artRefsGroups = /**@type {ArtifactRefsGroup[]}*/ ([])

	function warnOnCharacter(msg) {
		console.warn(`WARN: ${msg} of character '${characterCode}'`)
	}

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		function warnOnLine(msg) {
			warnOnCharacter(`${msg} in line '${line}'`)
		}

		const m = line.match(/^\d+\.\s*(.*)$/)
		if (m) {
			let artSetRef = /**@type {ArtifactRefSet}*/ ({
				arts: DUMMY_ART_REF,
				notes: '',
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

				const rawCode = getArtifactCodeFromName(name)
				let code = code2artifact.has(rawCode) ? rawCode : null
				if (!code && rawCode.endsWith('s') && code2artifact.has(rawCode.slice(0, -1)))
					code = rawCode.slice(0, -1)
				if (!code) {
					for (const fix of fixes.charactersArtifactsMatch) {
						if (!fix.characterCodes.includes(characterCode)) continue
						const fixedCode = getArtifactCodeFromName(name.replace(fix.replace, fix.with))
						if (code2artifact.has(fixedCode)) {
							code = fixedCode
							fix._used = true
							break
						}
					}
				}
				if (!code && /\+?18%atkset/i.test(name.replace(/\s/g, ''))) {
					code = ART_GROUP_18_ATK_CODE
				}
				if (!code && /\+?20%erset/i.test(name.replace(/\s/g, ''))) {
					code = ART_GROUP_20_ER_CODE
				}

				if (!code) {
					warnOnLine(`can not find artifact with '${name}'`)
					continue
				}
				addArtToTree(artSetRef, orWithPrev ? 'or' : 'and', { code, count }, msg => warnOnLine(msg))
			}

			// проверяем остальной текст в строке, обычно это "*" и "см. заметки"
			while (text) {
				let m
				if (text.startsWith('*')) {
					artSetRef.seeCharNotes = true
					text = text.slice(1).trim()
				} else if ((m = text.match(/^SEE NOTES BELOW/i)) !== null) {
					artSetRef.seeCharNotes = true
					text = text.slice(m[0].length).trim()
				} else if ((m = text.match(/^\[choose two\]/i)) !== null) {
					// ignoring
					text = text.slice(m[0].length).trim()
				} else {
					warnOnLine(`unexpected line remainder '${text}'`)
					break
				}
			}

			if (artSetRef.arts === DUMMY_ART_REF) {
				warnOnLine(`no arts found`)
			} else {
				if (artRefsGroups.length === 0)
					artRefsGroups.push({ title: null, refs: { sets: [], notes: '', seeCharNotes: false } })
				artRefsGroups.at(-1)?.refs.sets.push(artSetRef)
			}
		} else {
			const lineLC = line.toLocaleLowerCase()
			if (lineLC === '**check notes' || lineLC === '*read notes') {
				const group = artRefsGroups.at(-1)
				if (group) group.refs.seeCharNotes = true
				else warnOnLine('artifact notes before any artifact data')
			} else if (line.endsWith(':')) {
				const title = line.slice(0, -1).trim()
				artRefsGroups.push({ title, refs: { sets: [], notes: '', seeCharNotes: false } })
			} else if (lineLC === '[choose two]') {
				// it's for previous art, ignoring
			} else {
				let note = line.replace(/^note:\s+/i, '').replace(/^\*\*\s*/i, '')
				const group = artRefsGroups.at(-1)
				if (group) group.refs.notes = (group.refs.notes + '\n' + note).trim()
				else warnOnLine('artifact notes before any artifact data')
			}
		}
	}

	// проверка количества артефактов в наборах
	for (const group of artRefsGroups)
		for (const set of group.refs.sets) {
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

	return artRefsGroups
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
		circlet: { codes: [], notes: '', seeCharNotes: false },
		goblet: { codes: [], notes: '', seeCharNotes: false },
		sands: { codes: [], notes: '', seeCharNotes: false },
		notes: '',
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
			parseUnknownBonusLine(line, advices)
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
	const advices = { advices: [], notes: '', seeCharNotes: false }

	for (let line of lines) {
		line = line.trim()
		if (!line) continue

		let m
		if ((m = line.match(/^\d\.(.*)$/i)) !== null) {
			advices.advices.push(parseMatchedBonusLine(m[1], characterCode))
		} else {
			parseUnknownBonusLine(line, advices)
		}
	}
	return advices
}

/**
 * @param {string} bonusesText
 * @param {string} characterCode
 * @returns {ArtifactStatAdvice}
 */
function parseMatchedBonusLine(bonusesText, characterCode) {
	const codes = []
	let notes = ''
	let seeCharNotes = false

	function cutToNotes(m, cut) {
		notes = (cut + '\n' + notes).trim()
		return ''
	}
	bonusesText = bonusesText.replace(/\(([^\)]+)\)/, cutToNotes) // dmg (bla bla)
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
 * @param {string} line
 * @param {{notes:string, seeCharNotes:boolean}} obj
 */
function parseUnknownBonusLine(line, obj) {
	while (line) {
		let m
		if ((m = line.match(/^\*\*Check Notes/i)) !== null) {
			obj.seeCharNotes = true
			line = line.slice(m[0].length).trim()
		} else {
			obj.notes = (obj.notes + '\n' + line).trim()
			line = ''
		}
	}
}

/**
 * @param {ArtifactRefSet} artSetRef
 * @param {'and'|'or'} op
 * @param {ArtifactRef} art
 * @param {(msg:string) => unknown} onWarn
 */
function addArtToTree(artSetRef, op, art, onWarn) {
	if (artSetRef.arts === DUMMY_ART_REF) {
		artSetRef.arts = art
		if (op === 'or') onWarn(`can not 'or' with dummy art`)
	} else if ('code' in artSetRef.arts) {
		artSetRef.arts = { op, arts: [artSetRef.arts, art] }
		tryFixArtCounts(artSetRef.arts.arts, op)
	} else if (artSetRef.arts.op !== op) {
		const allCount = getArtTreeCount([artSetRef.arts], 'or')
		if (allCount === art.count) {
			artSetRef.arts = { op, arts: [artSetRef.arts, art] }
			tryFixArtCounts(artSetRef.arts.arts, op)
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
			})(artSetRef.arts)
		}
		// onWarn(`art count mismatch (${getArtTreeCount([artSetRef.arts], 'or')} ${art.count})`)
	} else if (artSetRef.arts.op === op) {
		artSetRef.arts.arts.push(art)
		tryFixArtCounts(artSetRef.arts.arts, op)
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
