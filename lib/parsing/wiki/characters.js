import { getCharacterCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { warn } from '#lib/utils/logs.js'
import { getTextContent, mustFindCellIndex, nodeHasClass, searchNodeNodes } from '#lib/xml.js'
import { compareCharacters } from '../sorting.js'
import { getWikiPage, mustForEachTableRow } from './common.js'

/**
 * @param {string} cacheDir
 * @param {import("#lib/parsing").Code2CharacterData} code2character
 */
export async function applyCharactersReleaseVersion(cacheDir, code2character) {
	const root = await getWikiPage('Character/List', cacheDir, 'en')

	const travelerCodes = Object.keys(code2character).filter(x => x.startsWith('traveler-'))

	const appliedToCodes = new Set()
	let isParsingVersions = false
	searchNodeNodes(root, node => {
		if (node.tag === 'h2') {
			const isVersions = getTextContent(node).trim() === 'Characters by Release Date'
			if (isParsingVersions && !isVersions) return true //reached next block (after versions)
			isParsingVersions = isVersions
			return 'skip-children'
		}

		if (isParsingVersions) {
			if (nodeHasClass(node, 'article-table')) {
				mustForEachTableRow(
					node,
					headerCells => ({
						name: mustFindCellIndex(headerCells, /name/i),
						version: mustFindCellIndex(headerCells, /version/i),
					}),
					(cells, nameIndex, rowIndex) => {
						const name = getTextContent(cells[nameIndex.name]).trim()
						const code = getCharacterCodeFromName(name)
						const codes = code === 'traveler' ? travelerCodes : [code]
						const version = getTextContent(cells[nameIndex.version]).trim()
						for (const code of codes) {
							if (code in code2character) {
								code2character[code].releaseVersion = version
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

	sortObject(code2character, (a, b) => compareCharacters(a[1], b[1]))
}
