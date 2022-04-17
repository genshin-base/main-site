import { getArtifactCodeFromName, GI_ARTIFACT_TYPE_CODES } from '#lib/genshin.js'
import { makeParagraphsCompact } from '#lib/parsing/helperteam/text.js'
import { arrShallowEqual, sortObject } from '#lib/utils/collections.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import {
	DUMMY_NODE,
	forEachTBodyRow,
	getMultilineTextContent,
	getTextContent,
	mustFindCellIndex,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	mustFindNodeWithTag,
} from '#lib/xml.js'
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
import { shouldSkipByFix } from './fixes.js'

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
						const bonuses = {
							bonus1: '',
							bonus2: '',
							bonus4: '',
							['bonus' + n]: fixes.descriptionLangFix(bonus, lang),
						}
						return (lastArt = { id, name, rarity, img, ...bonuses })
					} else if (lastArt !== null) {
						setLogPrefix(`artifact '${lastArt.name}'`)
						const descr = getTextContent(cells[colIndex.sets]).trim()
						if (descr !== '') {
							const [n, bonus] = mustParseSetDescriptionRow(descr)
							lastArt['bonus' + n] = fixes.descriptionLangFix(bonus, lang)
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
	for (const [id, art] of id2artifact.entries()) {
		if (shouldSkipByFix(fixes.skip.artifacts, art.en.name)) continue

		const item = {
			code: getArtifactCodeFromName(art.en.name),
			name: makeLangMap(art, 'name'),
			rarity: ensureSame(art, 'rarity'),
			sets: art.en.bonus1
				? { 1: makeLangMap(art, 'bonus1') }
				: { 2: makeLangMap(art, 'bonus2'), 4: makeLangMap(art, 'bonus4') },
			pieces: {},
		}
		code2item[item.code] = item
		id2item.set(id, item)
		code2img.set(item.code, ensureSame(art, 'img'))
	}
	sortObject(code2item, ([codeA], [codeB]) => codeA.localeCompare(codeB))

	// описания
	progress() //парсинг описаний довольно долгий
	for (const [id, artifact] of id2item) {
		const canRedirect = true //почему-то некоторые арты редиректят с art/family/a_id на art/a_id
		const root = await getHoneyPage('art/family/a_' + id, cacheDir, 'en', canRedirect)

		const pieces = tryWithContext(`art '${artifact.code}' pieces list`, 'skipping', null, () => {
			return mapTableRows(root, /^set pieces$/i, null, (cells, header, rowIndex) => {
				const text = getTextContent(cells[0]).trim()
				/** @type {{re:RegExp, type:import('#lib/genshin').GI_ArtifactTypeCode}[]} */
				const types = [
					{ re: /flower of life/i, type: 'flower' },
					{ re: /plume of death/i, type: 'plume' },
					{ re: /sands of eon/i, type: 'sands' },
					{ re: /goblet of eonothem/i, type: 'goblet' },
					{ re: /circlet of logos/i, type: 'circlet' },
				]
				const type = types.find(x => x.re.test(text))?.type
				if (!type) throw new Error(`can not get artifat type from '${text}'`)

				// у односетовых артефактов есть только корона, а остальные ссылки вообще не указаны
				if ('1' in artifact.sets && type !== 'circlet') return null

				const pieceId = mustFindNodeHrefMatch(cells[0], /^\/db\/art\/a_(\d+)/)[1]
				return { type, pieceId }
			})
		})
		if (!pieces) continue

		{
			const types = pieces.map(x => x.type)
			const expected = '1' in artifact.sets ? ['circlet'] : GI_ARTIFACT_TYPE_CODES
			if (!arrShallowEqual(types, expected))
				warn(`art '${artifact.code}' pieces: expected [${expected}], got [${types}]`)
		}

		for (const { type, pieceId } of pieces) {
			/**
			 * @type {Record<string, {
			 *   description: string,
			 *   story: import('#lib/parsing/helperteam/text').CompactTextParagraphs,
			 * }>}
			 */
			const extras = {}

			for (const lang of langs) {
				extras[lang] = { description: '', story: '' }
				const extra = extras[lang]
				const root = await getHoneyPage('art/a_' + pieceId, cacheDir, lang)

				tryWithContext(`artifact '${artifact.code}' #${id} descr`, 'skipping', null, () => {
					const tableNode = mustFindNodeByClass(root, 'item_main_table')
					const tbodyNode = mustFindNodeWithTag(tableNode, 'tbody')
					forEachTBodyRow(tbodyNode, (row, cells, rowIndex) => {
						if (cells.length < 3)
							throw new Error(`expectd >=3 cols in main table, got ${cells.length}`)
						if (/^description$/i.test(getTextContent(cells[1]).trim())) {
							extra.description = getTextContent(cells[2]).trim()
						}
					})
				})

				tryWithContext(`artifact '${artifact.code}' #${id} story`, 'skipping', null, () => {
					const node = mustFindNodeByClass(root, 'story_container')
					extra.story = makeParagraphsCompact(
						getMultilineTextContent(node)
							.trim()
							.split(/\n\n+/)
							.map(x => ({ p: x })),
					)
				})
			}

			const piece = (artifact.pieces[type] ??= { description: {}, story: {} })
			piece.description = makeLangMap(extras, 'description')
			piece.story = makeLangMap(extras, 'story')
		}
	}
	return { code2item, id2item, code2img }
}

/**
 * @param {import('#lib/parsing').Code2ArtifactSetData} code2artifact
 * @returns {import('#lib/parsing').ArtifcatSetGroupsCodes}
 */
export function getArtifactSpecialGroupCodes(code2artifact) {
	/** @type {import('#lib/parsing').ArtifcatSetGroupsCodes} */
	const groups = { '18%-atk': [], '20%-er': [] }
	for (const artifact of Object.values(code2artifact)) {
		const sets = artifact.sets
		if ('2' in sets) {
			if (/^atk \+18%\.?$/i.test(sets[2].en)) groups['18%-atk'].push(artifact.code)
			if (/^energy recharge \+20%\.?$/i.test(sets[2].en)) groups['20%-er'].push(artifact.code)
		}
	}
	for (const codes of Object.values(groups))
		codes.sort((aCode, bCode) => {
			const a = code2artifact[aCode]
			const b = code2artifact[bCode]
			return b.rarity - a.rarity || aCode.localeCompare(bCode)
		})
	return groups
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
