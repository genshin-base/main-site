import { getArtifactCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { tryWithContext } from '#lib/utils/logs.js'
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
	mustCountRarityStars,
} from './common.js'

/**
 * @param {string} cacheDir
 * @param {string[]} langs
 * @param {import('./fixes').HoneyhunterFixes} fixes
 * @returns {Promise<{
 *   code2item: import('#lib/parsing').Code2ArtifactSetData,
 *   id2item: Map<string, import('#lib/parsing').ArtifactSetData>,
 *   code2img: import('./common').Code2ImageUrl
 * }>}
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
			(cells, colIndex, rowIndex) =>
				tryWithContext('artifact', 'skipping', null, setLogPrefix => {
					const nameCell = cells[colIndex.name]
					if (nameCell === DUMMY_NODE) return null

					const { id, name } = mustGetIdAndName(nameCell, /\/a_(\d+)/, rowIndex)
					setLogPrefix(`artifact '${name}'`)

					const rarity = mustCountRarityStars(
						cells[colIndex.rarity],
						'star_art_wrap_cont',
						'sea_char_stars_wrap',
						'max',
					)

					const img = mustGetImgUrl(cells[colIndex.icon], `artifacts row #${rowIndex + 1}`)
					return { id, name, rarity, img }
				}),
		)
		addLangItems(id2artifact, lang, items)
	}

	const code2item = /**@type {import('#lib/parsing').Code2ArtifactSetData}*/ ({})
	const id2item = /**@type {Map<string, import('#lib/parsing').ArtifactSetData>}*/ (new Map())
	const code2img = /**@type {import('./common').Code2ImageUrl}*/ (new Map())
	id2artifact.forEach((art, id) => {
		const item = {
			code: getArtifactCodeFromName(art.en.name),
			name: makeLangMap(art, 'name'),
			rarity: ensureSame(art, 'rarity'),
		}
		code2item[item.code] = item
		id2item.set(id, item)
		code2img.set(item.code, ensureSame(art, 'img'))
	})
	sortObject(code2item, ([codeA], [codeB]) => codeA.localeCompare(codeB))
	return { code2item, id2item, code2img }
}
