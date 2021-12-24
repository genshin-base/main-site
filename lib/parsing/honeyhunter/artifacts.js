import { getArtifactCodeFromName } from '#lib/genshin.js'
import {
	getHoneyPage,
	mapTableRows,
	mustFindCellIndex,
	DUMMY_NODE,
	mustGetIdAndName,
	mustGetImgUrl,
	addLangItems,
	forEachSortedLangItem,
	makeLangMap,
	ensureSame,
} from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{langNames:import('#lib/parsing').ItemsLangNames, imgs:import('./common').Code2ImageUrl}>}
 */
export async function extractArtifactsData(cacheDir, langs, fixes) {
	const id2artifact = /**@type {import('./common').IdLangMap<{id:string, name:string, img:string}>}*/ (
		new Map()
	)

	for (const lang of langs) {
		const root = await getHoneyPage('artifact', cacheDir, lang)
		const items = await mapTableRows(
			root,
			/(?: Sets|Uncategorized)$/i,
			header => ({
				icon: mustFindCellIndex(header.children, /^icon$/i),
				name: mustFindCellIndex(header.children, /^set name$/i),
			}),
			(cells, colIndex, rowIndex) => {
				const iconCell = cells[colIndex.icon]
				const nameCell = cells[colIndex.name]
				if (nameCell === DUMMY_NODE) return null

				return {
					...mustGetIdAndName(nameCell, /\/a_(\d+)/, rowIndex),
					img: mustGetImgUrl(iconCell, rowIndex),
				}
			},
		)
		addLangItems(id2artifact, lang, items)
	}

	const langNames = /**@type {import('#lib/parsing').ItemsLangNames}*/ ({})
	const imgs = new Map()
	forEachSortedLangItem(id2artifact, getArtifactCodeFromName, (code, art) => {
		langNames[code] = makeLangMap(art, 'name')
		imgs.set(code, ensureSame(art, 'img'))
	})
	return { langNames, imgs }
}
