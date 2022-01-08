import { getArtifactCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { warn } from '#lib/utils/logs.js'
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
	countRarityStars,
} from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{items:import('#lib/parsing').Code2ArtifactData, imgs:import('./common').Code2ImageUrl}>}
 */
export async function extractArtifactsData(cacheDir, langs, fixes) {
	/**
	 * @typedef {import('./common').IdLangMap<{
	 *   id: string,
	 *   name: string,
	 *   img: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode}>
	 * } ArtLang
	 */
	const id2artifact = /**@type {ArtLang}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('artifact', cacheDir, lang)
		const items = await mapTableRows(
			root,
			/(?: Sets|Uncategorized)$/i,
			header => ({
				icon: mustFindCellIndex(header.children, /^icon$/i),
				name: mustFindCellIndex(header.children, /^set name$/i),
				rarity: mustFindCellIndex(header.children, /^quality$/i),
			}),
			(cells, colIndex, rowIndex) => {
				const nameCell = cells[colIndex.name]
				if (nameCell === DUMMY_NODE) return null
				const { id, name } = mustGetIdAndName(nameCell, /\/a_(\d+)/, rowIndex)

				let rarity = countRarityStars(
					cells[colIndex.rarity],
					'star_art_wrap_cont',
					'sea_char_stars_wrap',
					'max',
				)
				if (rarity instanceof Error) {
					warn(`artifact '${name}': ${rarity.message}, using 5`)
					rarity = 5
				}

				const img = mustGetImgUrl(cells[colIndex.icon], `artifacts row #${rowIndex + 1}`)
				return { id, name, rarity, img }
			},
		)
		addLangItems(id2artifact, lang, items)
	}

	const items = /**@type {import('#lib/parsing').Code2ArtifactData}*/ ({})
	const imgs = new Map()
	id2artifact.forEach((art, id) => {
		const code = getArtifactCodeFromName(art.en.name)
		items[code] = {
			code,
			name: makeLangMap(art, 'name'),
			rarity: ensureSame(art, 'rarity'),
		}
		imgs.set(code, ensureSame(art, 'img'))
	})
	sortObject(items, ([codeA], [codeB]) => codeA.localeCompare(codeB))
	return { items, imgs }
}
