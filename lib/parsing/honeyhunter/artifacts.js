import { getArtifactCodeFromName } from '#lib/genshin.js'
import { sortObject } from '#lib/utils/collections.js'
import { tryWithContext } from '#lib/utils/logs.js'
import { DUMMY_NODE, getTextContent, mustFindCellIndex } from '#lib/xml.js'
import {
	getHoneyPage,
	mapTableRows,
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
	 * @typedef {{
	 *   id: string,
	 *   name: string,
	 *   img: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode
	 *   bonus1: string,
	 *   bonus2: string,
	 *   bonus4: string,
	 * }} ArtLang
	 */
	const id2artifact = /**@type {import('./common').IdLangMap<ArtLang>}*/ (new Map())

	for (const lang of langs) {
		const root = await getHoneyPage('artifact', cacheDir, lang)
		let lastArt = /**@type {ArtLang|null}*/ (null)
		const items = mapTableRows(
			root,
			/(?: Sets|Uncategorized)$/i,
			headerCells => ({
				icon: mustFindCellIndex(headerCells, /^icon$/i),
				name: mustFindCellIndex(headerCells, /^set name$/i),
				rarity: mustFindCellIndex(headerCells, /^quality$/i),
				sets: mustFindCellIndex(headerCells, /^Set Effect Description$/i),
			}),
			(cells, colIndex, rowIndex) =>
				tryWithContext('artifact', 'skipping', null, setLogPrefix => {
					const nameCell = cells[colIndex.name]
					if (nameCell !== DUMMY_NODE) {
						const { id, name } = mustGetIdAndName(nameCell, /\/a_(\d+)/, rowIndex)
						setLogPrefix(`artifact '${name}'`)

						const rarity = mustCountRarityStars(
							cells[colIndex.rarity],
							'star_art_wrap_cont',
							'sea_char_stars_wrap',
							'max',
						)

						const img = mustGetImgUrl(cells[colIndex.icon], `artifacts row #${rowIndex + 1}`)

						const [n, bonus] = mustParseSetDescriptionRow(getTextContent(cells[colIndex.sets]))
						const bonuses = { bonus1: '', bonus2: '', bonus4: '', ['bonus' + n]: bonus }
						return (lastArt = { id, name, rarity, img, ...bonuses })
					} else if (lastArt !== null) {
						setLogPrefix(`artifact '${lastArt.name}'`)
						const descr = getTextContent(cells[colIndex.sets]).trim()
						if (descr !== '') {
							const [n, bonus] = mustParseSetDescriptionRow(descr)
							lastArt['bonus' + n] = bonus
						}
						return null
					} else {
						return null
					}
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
			sets: art.en.bonus1
				? { 1: makeLangMap(art, 'bonus1') }
				: { 2: makeLangMap(art, 'bonus2'), 4: makeLangMap(art, 'bonus4') },
		}
		code2item[item.code] = item
		id2item.set(id, item)
		code2img.set(item.code, ensureSame(art, 'img'))
	})
	sortObject(code2item, ([codeA], [codeB]) => codeA.localeCompare(codeB))

	// // описания бонусов
	// for (const [id, artifact] of id2item) {
	// 	for (const lang of langs) {
	// 		const canRedirect = true //почему-то некоторые арты редиректят с art/family/a_id на art/a_id
	// 		const root = await getHoneyPage('art/family/a_' + id, cacheDir, lang, canRedirect)
	// 		tryWithContext(`art '${artifact.code}' ${lang} bonuses`, 'skipping', null, () => {
	// 			const bonuses = /**@type {Record<string,string>}*/ ({})

	// 			const table = mustFindNodeByClass(root, 'item_main_table')
	// 			const tbody = mustFindNodeWithTag(table, 'tbody')
	// 			forEachTBodyRow(tbody, (row, cells, rowIndex) => {
	// 				const label = getTextContent(cells.at(1) ?? '').trim()
	// 				const m = label.match(/^(1|2|4) piece bonus$/i)
	// 				if (m) bonuses[m[1]] = getTextContent(cells[2]).trim()
	// 			})

	// 			const keys = Object.keys(bonuses)
	// 			if (arrShallowEqual(keys, ['1'])) {
	// 				if (artifact.sets === DUMMY_SETS) artifact.sets = { 1: {} }
	// 				if ('2' in artifact.sets) throw new Error('got x1 set, expected x2/x4')
	// 				artifact.sets[1][lang] = bonuses[1]
	// 			} else if (arrShallowEqual(keys, ['2', '4'])) {
	// 				if (artifact.sets === DUMMY_SETS) artifact.sets = { 2: {}, 4: {} }
	// 				if ('1' in artifact.sets) throw new Error('got x2/x4 set, expected x1')
	// 				artifact.sets[2][lang] = bonuses[2]
	// 				artifact.sets[4][lang] = bonuses[4]
	// 			} else {
	// 				throw new Error(`strange bonuses combination: ` + keys.map(x => 'x' + x))
	// 			}
	// 		})
	// 	}
	// }
	return { code2item, id2item, code2img }
}

/**
 * @param {string} text
 * @returns {['1'|'2'|'4', string]}
 */
function mustParseSetDescriptionRow(text) {
	const m = text.trim().match(/^(1|2|4) piece(?: bonus)?:([\d\D]*)$/i)
	if (!m) throw new Error(`wrong description: ` + text)
	return [/**@type {*}*/ (m[1]), m[2].trim()]
}
