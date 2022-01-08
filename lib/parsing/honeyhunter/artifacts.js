import { getArtifactCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import {
	getHoneyPage,
	mapTableRows,
	mustFindCellIndex,
	DUMMY_NODE,
	mustGetIdAndName,
	mustGetImgUrl,
	addLangItems,
	makeLangMap,
	ensureSame,
} from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{items:import('#lib/parsing').Code2ArtifactData, imgs:import('./common').Code2ImageUrl}>}
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
					img: mustGetImgUrl(iconCell, `artifacts row #${rowIndex + 1}`),
				}
			},
		)
		addLangItems(id2artifact, lang, items)
	}

	const items = /**@type {import('#lib/parsing').Code2ArtifactData}*/ ({})
	const imgs = new Map()
	id2artifact.forEach((art, id) => {
		const code = getArtifactCodeFromName(art.en.name)
		items[code] = { code, name: makeLangMap(art, 'name') }
		imgs.set(code, ensureSame(art, 'img'))
	})
	sortObject(items, ([codeA], [codeB]) => codeA.localeCompare(codeB))
	return { items, imgs }
}
