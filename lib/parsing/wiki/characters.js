import { getCharacterCodeFromName } from '#lib/genshin.js'
import { warn } from '#lib/utils/logs.js'
import { getTextContent, mustFindCellIndex, nodeHasClass, searchNodeNodes } from '#lib/xml.js'
import { getWikiPage, mustForEachTableRow } from './common.js'

/**
 * @param {string} cacheDir
 * @param {import("#lib/parsing").Code2CharacterData} code2character
 */
export async function applyCharactersReleaseVersion(cacheDir, code2character) {
	const root = await getWikiPage('Characters/List', cacheDir, 'en')

	const travelerCodes = Object.keys(code2character).filter(x => x.endsWith('-traveler'))

	const appliedToCodes = new Set()
	let isParsingVersions = false
	let curVersion = null
	searchNodeNodes(root, node => {
		if (node.tag === 'h2') {
			const isVersions = getTextContent(node).trim() === 'Characters by Release Version'
			if (isParsingVersions && !isVersions) return true //reached next block (after versions)
			isParsingVersions = isVersions
			return 'skip-children'
		}

		if (isParsingVersions) {
			if (node.tag === 'h3') {
				const title = getTextContent(node)
				const m = title.trim().match(/version (\d+\.\d+)/i)
				if (m) curVersion = m[1]
				else warn(`wiki character version: wrong versions title '${title}'`)
				return 'skip-children'
			}

			if (nodeHasClass(node, 'article-table')) {
				mustForEachTableRow(
					node,
					headerCells => mustFindCellIndex(headerCells, /name/i),
					(cells, nameIndex, rowIndex) => {
						const name = getTextContent(cells[nameIndex]).trim()
						const code = getCharacterCodeFromName(name)
						const codes = code === 'traveler' ? travelerCodes : [code]
						for (const code of codes) {
							if (code in code2character) {
								code2character[code].releaseVersion = curVersion
								appliedToCodes.add(code)
							} else warn(`wiki character version: unknown character '${name}'`)
						}
					},
				)
				return 'skip-children'
			}
		}

		return false
	})

	for (const character of Object.values(code2character)) {
		if (!appliedToCodes.has(character.code))
			warn(
				`character '${character.code}': could not get release version ` +
					`from wiki, using '${character.releaseVersion}'`,
			)
	}
}
