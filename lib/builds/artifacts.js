/**
 * @typedef {{
 *   code: string,
 *   sets: {'1':string} | {'2':string, '4':string}
 * }} ArtifactInfo
 */

/** @typedef {{code:string, count:number}} ArtifactRef */

/** @typedef {{op:'and'|'or', arts:(ArtifactRef|ArtifactNodeRef)[]}} ArtifactNodeRef */

/** @typedef {{arts:ArtifactRef|ArtifactNodeRef, notes:string, seeCharNotes:boolean}} ArtifactSetRef */

/** @typedef {{groups:{title:string, sets:ArtifactSetRef[], notes:string, seeCharNotes:boolean}[]}} ArtifactRefs */

export const ART_GROUP_18_ATK_CODE = '18%-atk'
export const ART_GROUP_20_ER_CODE = '20%-er'

/** @type {ArtifactRef} */
const DUMMY_ART_REF = { code: '', count: -1 }

/**
 * @param {ArtifactSetRef} artSetRef
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
			/** @param {ArtifactNodeRef} node */
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
 * @param {(ArtifactRef|ArtifactNodeRef)[]} roots
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
 * @param {(ArtifactRef|ArtifactNodeRef)[]} roots
 * @param {'and'|'or'} op
 */
function tryFixArtCounts(roots, op) {
	if (op !== 'or') return
	const count = getArtTreeCount(roots, 'or')
	if (!isNaN(count)) for (const root of roots) if ('code' in root) root.count = count
}
/**
 * @param {ArtifactRef|ArtifactNodeRef} root
 * @param {boolean} [noOuterBrackets]
 */
function artTreeToString(root, noOuterBrackets) {
	if ('code' in root) return `${root.code}:${root.count}`
	let childrenStr = root.arts.map(x => artTreeToString(x)).join(` ${root.op.toLocaleUpperCase()} `)
	if (!noOuterBrackets) childrenStr = '(' + childrenStr + ')'
	return childrenStr
}

/**
 * @param {string} name
 */
export function getArtifactCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s/g, '-').replace(/'/g, '')
}

/**
 * @param {string[]} lines
 * @param {Map<string,ArtifactInfo>} code2artifact
 * @param {string} characterCode
 * @param {import('./utils.js').BuildsExtractionFixes} fixes
 * @returns {ArtifactRefs}
 */
export function extractArtifactRefs(lines, code2artifact, characterCode, fixes) {
	const artRefs = /**@type {ArtifactRefs}*/ ({ groups: [], seeCharNotes: false })

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
			let artSetRef = /**@type {ArtifactSetRef}*/ ({
				arts: DUMMY_ART_REF,
				notes: '',
				seeCharNotes: false,
			})
			let artsText = m[1]
			while (true) {
				artsText = artsText.trim()
				if (!artsText) break

				const m = artsText.match(/^(\/)?[+,]?(.*?)(?:\((\d+)\)|(?=\/))/)
				if (!m) break
				const newArtsText = artsText.slice(m[0].length).trim()

				const orWithPrev = m[1] !== undefined
				const name = m[2].trim()
				const count = parseInt(m[3], 10)
				const orWithNext = newArtsText.startsWith('/')
				if (isNaN(count) && !orWithNext) break
				artsText = newArtsText

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
			while (artsText) {
				let m
				if (artsText.startsWith('*')) {
					artSetRef.seeCharNotes = true
					artsText = artsText.slice(1).trim()
				} else if ((m = artsText.match(/^SEE NOTES BELOW(.*)$/i)) !== null) {
					artSetRef.seeCharNotes = true
					artsText = m[1]
				} else if ((m = artsText.match(/^\[choose two\](.*)$/i)) !== null) {
					// ignoring
					artsText = m[1]
				} else {
					warnOnLine(`unexpected line remainder '${artsText}'`)
					break
				}
			}

			if (artRefs.groups.length === 0)
				artRefs.groups.push({ title: '', sets: [], notes: '', seeCharNotes: false })
			artRefs.groups.at(-1)?.sets.push(artSetRef)
		} else {
			const lineLC = line.toLocaleLowerCase()
			if (lineLC === '**check notes' || lineLC === '*read notes') {
				const group = artRefs.groups.at(-1)
				if (group) group.seeCharNotes = true
				else warnOnLine('artifact notes before any artifact data')
			} else if (line.endsWith(':')) {
				const title = line.slice(0, -1).trim()
				artRefs.groups.push({ title, sets: [], notes: '', seeCharNotes: false })
			} else if (lineLC === '[choose two]') {
				// it's for previous art, ignoring
			} else {
				let note = line.replace(/^note:\s+/i, '').replace(/^\*\*\s*/i, '')
				const group = artRefs.groups.at(-1)
				if (group) group.notes = (group.notes + '\n' + note).trim()
				else warnOnLine('artifact notes before any artifact data')
			}
		}
	}

	for (const group of artRefs.groups)
		for (const set of group.sets) {
			const setStr = () => artTreeToString(set.arts, true)
			/**
			 * @param {ArtifactRef|ArtifactNodeRef} node
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
				warnOnCharacter(`arts total count ${total} != (${expectedCounts}) (${setStr()})`)
		}

	return artRefs
}
