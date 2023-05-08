import { getArtifactCodeFromName, GI_ARTIFACT_TYPE_CODES } from '#lib/genshin.js'
import { makeParagraphsCompact } from '#lib/parsing/helperteam/text.js'
import { arrShallowEqual, sortObject } from '#lib/utils/collections.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import { trimLines } from '#lib/utils/strings.js'
import { mustBeDefined } from '#lib/utils/values.js'
import {
	forEachTBodyRow,
	getMultilineTextContent,
	getTextContent,
	mustFindNodeByClass,
	mustFindNodeHrefMatch,
	mustFindNodeWithTag,
	searchNodeNodes,
	searchNodeWithTag,
} from '#lib/xml.js'
import { fixTextTypography as typo } from '../typography.js'
import {
	getHoneyPage,
	makeLangMap,
	ensureSame,
	mustCountRarityStars,
	mustGetJSTableRows,
	addLangItem,
	mustGetImgUrl,
} from './common.js'
import { shouldSkipByFix } from './fixes.js'

export const ART_SET_ID_VARIANT_PREFIX = 'variant-'

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
	const artSetIds = /**@type {string[][]}*/ ([])
	const root = await getHoneyPage('fam_art_set', cacheDir, 'en')
	tryWithContext('art sets', 'skipping', null, setLogPrefix => {
		const table = mustGetJSTableRows(root, /Artifact Set/, 'main-table')

		for (const cells of table.rows) {
			tryWithContext('art sets', 'skipping', null, setLogPrefix => {
				const nameCell = cells[table.mustGetColIndex('Name')]
				const name = getTextContent(nameCell).trim()
				setLogPrefix(`art set '${name}'`)

				const variantCell = cells[table.mustGetColIndex('Variants')]
				const variantIds = []
				searchNodeWithTag(variantCell, 'a', node => {
					variantIds.push(mustFindNodeHrefMatch(node, /^\/i_(n?\d+)/)[1])
					return 'skip-children'
				})
				if (variantIds.length === 0) throw new Error('no variants')

				artSetIds.push(variantIds)
			})
		}
	})

	/**
	 * @typedef {{
	 *   id: string,
	 *   variantIds: string[],
	 *   name: string,
	 *   img: string,
	 *   rarity: import('#lib/genshin').GI_RarityCode
	 *   bonus1: string,
	 *   bonus2: string,
	 *   bonus4: string,
	 *   pieceIds: string[],
	 * }} ArtLang
	 */
	const id2artifact = /**@type {import('./common').IdLangMap<ArtLang>}*/ (new Map())

	for (const variantIds of artSetIds) {
		const id = variantIds[variantIds.length - 1] //max lvl id
		for (const lang of langs) {
			const root = await getHoneyPage(`i_${id}`, cacheDir, lang)

			tryWithContext(`art set ${lang} #${id}`, 'skipping', null, setLogPrefix => {
				/** @type {ArtLang} */
				const art = {
					id,
					variantIds,
					name: '',
					img: '',
					rarity: 1,
					bonus1: '',
					bonus2: '',
					bonus4: '',
					pieceIds: [],
				}

				const table = mustFindNodeByClass(root, 'main_table')
				const tbody = mustFindNodeWithTag(table, 'tbody')
				forEachTBodyRow(tbody, (row, cells, rowIndex) => {
					if (rowIndex === 0) {
						art.img = mustGetImgUrl(cells[0])
					}
					const title = getTextContent(cells[1]).trim()
					if (title === 'Name') {
						art.name = getTextContent(cells[2]).trim()
					} else if (title === 'Rarity') {
						art.rarity = mustCountRarityStars(cells[2], null, 'cur_icon', false)
					} else if (title === '1-Piece') {
						art.bonus1 = fixes.descriptionLangFix(getTextContent(cells[2]).trim(), lang)
					} else if (title === '2-Piece') {
						art.bonus2 = fixes.descriptionLangFix(getTextContent(cells[2]).trim(), lang)
					} else if (title === '4-Piece') {
						art.bonus4 = fixes.descriptionLangFix(getTextContent(cells[2]).trim(), lang)
					}
				})

				setLogPrefix(`art '${art.name}' pieces list`)
				const piecesTable = mustGetJSTableRows(root, /Set Pieces/, 'section-table')
				for (const cells of piecesTable.rows) {
					const nameCell = cells[piecesTable.mustGetColIndex('Name')]
					const [, id] = mustFindNodeHrefMatch(nameCell, /^\/i_(n\d+)/)
					art.pieceIds.push(id)
				}
				addLangItem(id2artifact, lang, art)
			})
		}
	}

	const code2item = /**@type {import('#lib/parsing').Code2ArtifactSetData}*/ ({})
	const id2item = /**@type {Map<string, import('#lib/parsing').ArtifactSetData>}*/ (new Map())
	const code2img = /**@type {import('./common').Code2ImageUrl}*/ (new Map())
	for (const [id, art] of id2artifact.entries()) {
		if (shouldSkipByFix(fixes.skip.artifacts, art.en.name)) continue

		const item = {
			code: getArtifactCodeFromName(art.en.name),
			name: typo(makeLangMap(art, 'name')),
			rarity: ensureSame(art, 'rarity'),
			sets: art.en.bonus1
				? { 1: typo(makeLangMap(art, 'bonus1')) }
				: { 2: typo(makeLangMap(art, 'bonus2')), 4: typo(makeLangMap(art, 'bonus4')) },
			pieces: {},
		}
		code2item[item.code] = item
		id2item.set(id, item)
		for (const vid of art.en.variantIds) id2item.set(ART_SET_ID_VARIANT_PREFIX + vid, item)
		code2img.set(item.code, ensureSame(art, 'img'))
	}
	sortObject(code2item, ([codeA], [codeB]) => codeA.localeCompare(codeB))

	// описания
	progress() //парсинг описаний довольно долгий
	for (const [id, artifact] of id2item) {
		if (id.startsWith(ART_SET_ID_VARIANT_PREFIX)) continue
		for (const pieceId of mustBeDefined(id2artifact.get(id)).en.pieceIds) {
			/**
			 * @type {Record<string, {
			 *   type: import("#lib/genshin").GI_ArtifactTypeCode | null,
			 *   name: string,
			 *   description: string,
			 *   story: import('#lib/parsing/helperteam/text').CompactTextParagraphs,
			 * }>}
			 */
			const extras = {}

			for (const lang of langs) {
				const code = artifact.code
				extras[lang] = { type: null, name: '', description: '', story: '' }
				const extra = extras[lang]
				const root = await getHoneyPage(`i_${pieceId}`, cacheDir, lang)

				tryWithContext(`artifact '${code}' #${id} type and descr`, 'skipping', null, () => {
					const tableNode = mustFindNodeByClass(root, 'main_table')
					const tbodyNode = mustFindNodeWithTag(tableNode, 'tbody')
					forEachTBodyRow(tbodyNode, (row, cells, rowIndex) => {
						const title = getTextContent(cells[1]).trim()
						if (title === 'Description') {
							extra.description = getTextContent(cells[2]).trim()
						} else if (title === 'Family') {
							const text = getTextContent(cells[2]).trim()
							/** @type {{re:RegExp, type:import("#lib/genshin").GI_ArtifactTypeCode}[]} */
							const types = [
								{ re: /flower of life/i, type: 'flower' },
								{ re: /plume of death/i, type: 'plume' },
								{ re: /sands of eon/i, type: 'sands' },
								{ re: /goblet of eonothem/i, type: 'goblet' },
								{ re: /circlet of logos/i, type: 'circlet' },
							]
							const type = types.find(x => x.re.test(text))?.type
							if (!type) throw new Error(`can not get artifact type from '${text}'`)
							extra.type = type
						}
					})
				})

				tryWithContext(`artifact '${code}' #${id} ${extra.type} name`, 'skipping', null, () => {
					const titleNode = mustFindNodeByClass(root, 'wp-block-post-title')
					extra.name = getTextContent(titleNode).trim()
				})

				tryWithContext(`artifact '${code}' #${id} ${extra.type} story`, 'skipping', null, () => {
					const wrap = searchNodeNodes(root, node => node.attrs.id === 'item_story')
					if (!wrap) throw new Error('description wrap elem not found')
					const table = mustFindNodeWithTag(wrap.node, 'table')
					extra.story = makeParagraphsCompact(
						getMultilineTextContent(table)
							.trim()
							.split(/\n[\n\s]*\n/)
							.map(x => ({ p: trimLines(x) })),
					)
				})
			}

			if (extras.en.type !== null) {
				const piece = (artifact.pieces[extras.en.type] ??= { name: {}, description: {}, story: {} })

				piece.name = typo(makeLangMap(extras, 'name'))
				piece.description = typo(makeLangMap(extras, 'description'))
				piece.story = typo(makeLangMap(extras, 'story'))

				sortObject(
					// @ts-ignore
					artifact.pieces,
					([a], [b]) => GI_ARTIFACT_TYPE_CODES.indexOf(a) - GI_ARTIFACT_TYPE_CODES.indexOf(b),
				)
			}
		}

		const types = Object.keys(artifact.pieces)
		const expected = '1' in artifact.sets ? ['circlet'] : GI_ARTIFACT_TYPE_CODES
		if (!arrShallowEqual(types, expected))
			warn(`art '${artifact.code}' pieces: expected [${expected}], got [${types}]`)
	}

	return { code2item, id2item, code2img }
}

/**
 * @param {import('#lib/parsing').Code2ArtifactSetData} code2artifact
 * @returns {import('#lib/parsing').ArtifcatSetGroupsCodes}
 */
export function getArtifactSpecialGroupCodes(code2artifact) {
	/** @type {import('#lib/parsing').ArtifcatSetGroupsCodes} */
	const groups = {
		'18%-atk': [],
		'25%-ph-atk': [],
		'15%-anemo': [],
		'20%-er': [],
		'80-em': [],
		'15%-heal': [],
	}
	for (const artifact of Object.values(code2artifact)) {
		const sets = artifact.sets
		if ('2' in sets) {
			if (/^atk \+18%\.?$/i.test(sets[2].en)) groups['18%-atk'].push(artifact.code)
			if (/^physical dmg (is increased by 25%|\+25%).?$/i.test(sets[2].en))
				groups['25%-ph-atk'].push(artifact.code)
			if (/^Anemo DMG Bonus \+15%$/i.test(sets[2].en)) groups['15%-anemo'].push(artifact.code)
			if (/^energy recharge \+20%\.?$/i.test(sets[2].en)) groups['20%-er'].push(artifact.code)
			if (/^(Increases Elemental Mastery by 80|Elemental Mastery \+80)\.?$/i.test(sets[2].en))
				groups['80-em'].push(artifact.code)
			if (/^(character healing effectiveness \+15%|healing bonus \+15%)\.?$/i.test(sets[2].en))
				groups['15%-heal'].push(artifact.code)
		}
	}
	for (const [groupCode, codes] of Object.entries(groups)) {
		if (codes.length === 0) warn(`art groups: group '${groupCode}' is empty`)
		codes.sort((aCode, bCode) => {
			const a = code2artifact[aCode]
			const b = code2artifact[bCode]
			return b.rarity - a.rarity || aCode.localeCompare(bCode)
		})
	}
	return groups
}
