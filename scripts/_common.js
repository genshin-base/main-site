import yaml from 'yaml'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { stringifyString } from 'yaml/util'
import { GI_MAP_CODES } from '#lib/genshin.js'
import { warn } from '#lib/utils/logs.js'
import { textNodesFromMarkdown, textNodesToMarkdown } from '#lib/parsing/helperteam/text-markdown.js'
import { buildsConvertLangMode, getBuildsFormattedBlocks } from '#lib/parsing/helperteam/build_texts.js'

const __filename = fileURLToPath(import.meta.url)
export const BASE_DIR = dirname(__filename) + '/..'
export const CACHE_DIR = `${BASE_DIR}/cache`
export const BUILDS_CACHE_DIR = `${CACHE_DIR}/builds`
export const DATA_CACHE_DIR = `${CACHE_DIR}/data`
export const IMGS_CACHE_DIR = `${CACHE_DIR}/imgs`
export const DATA_DIR = `${BASE_DIR}/data`
export const GENERATED_DATA_DIR = `${DATA_DIR}/generated`
export const TRANSLATED_DATA_DIR = `${DATA_DIR}/translated`
export const TRANSLATED_BUILDS_DIR = `${TRANSLATED_DATA_DIR}/builds`
export const TRANSLATED_BUILDS_REF_FPATH = `${TRANSLATED_BUILDS_DIR}/reference.yaml`
export const TRANSLATED_BUILDS_LANG_FPATH = (/**@type {string}*/ lang) =>
	`${TRANSLATED_BUILDS_DIR}/${lang}.md`
export const WWW_API_FILE = `${BASE_DIR}/www/src/api/generated.js`
export const WWW_DYNAMIC_DIR = `${BASE_DIR}/www/public/generated`
export const WWW_MEDIA_DIR = `${BASE_DIR}/www/public/media`

const location = /**@type {yaml.ScalarTag}*/ ({
	tag: '!loc',
	identify: val => typeof val === 'object' && val !== null && 'mapCode' in val && 'x' in val && 'y' in val,
	stringify(item, ctx, onComment, onChompKeep) {
		const { mapCode, x, y } = /**@type {import('#lib/genshin').MapLocation}*/ (item.value)
		return stringifyString({ value: `${mapCode} ${x} ${y}` }, ctx, onComment, onChompKeep)
	},
	resolve(value, onError, options) {
		const [mapCode, xStr, yStr, ...rem] = value.split(' ')
		const x = parseFloat(xStr)
		const y = parseFloat(yStr)
		if (GI_MAP_CODES.includes(/**@type {*}*/ (mapCode)) && !isNaN(x) && !isNaN(y) && rem.length === 0)
			return /**@type {import('#lib/genshin').MapLocation}*/ ({ mapCode, x, y })
		throw new Error('wrong location: ' + value)
	},
})
const customTags = [location]

/**
 * @param {string} dirpath
 * @param {boolean} clear
 */
export async function prepareCacheDir(dirpath, clear) {
	if (clear) await fs.rm(dirpath, { recursive: true, force: true })
	await fs.mkdir(dirpath, { recursive: true })
}

/**
 * @param {string} content
 * @returns {any}
 */
export function parseYaml(content) {
	return yaml.parse(content, { customTags })
}
/**
 * @param {any} data
 * @returns {string}
 */
export function stringifyYaml(data) {
	return yaml.stringify(data, { customTags })
}

/**
 * @param {[import('#lib/parsing/helperteam/text').CompactTextParagraphs|null, string][]} blocks
 * @returns {string}
 */
export function textBlocksToMarkdown(blocks) {
	const items = []
	for (const [paragraph, path] of blocks) {
		if (paragraph === null) continue
		items.push({ src: textNodesToMarkdown(paragraph), path, replacedFrom: null })
	}
	return textBlocksSrcToMarkdown(items)
}
/**
 * @param {{src:string, path:string, replacedFrom:string|null}[]} blocks
 * @returns {string}
 */
export function textBlocksSrcToMarkdown(blocks) {
	return blocks
		.map(({ src, path, replacedFrom }) => {
			return '# === ' + path + ' ===\n\n' + (replacedFrom ? `\`replace-from:${replacedFrom}\`` : src)
		})
		.join('\n\n\n')
}
/**
 * @param {string} text
 * @returns {{
 *   block: import('#lib/parsing/helperteam/text').CompactTextParagraphs,
 *   src: string,
 *   path: string,
 *   replacedFrom: string|null,
 * }[]}
 */
export function textBlocksFromMarkdown(text) {
	const chunks = text.split(/(?:^|\n+)# ===(.*?)===\n+/g)
	const res = /**@type {ReturnType<typeof textBlocksFromMarkdown>}*/ ([])
	if (chunks[0].trim() !== '') warn(`markdown text blocks: dropping prefix ${JSON.stringify(chunks[0])}`)

	for (let i = 1; i < chunks.length; i += 2) {
		const src = chunks[i + 1]
		/**@type {ReturnType<typeof textBlocksFromMarkdown>[number]}*/
		const item = { block: '', src, path: chunks[i].trim(), replacedFrom: null }

		const m = src.match(/`replace-from:(.+?)`/)
		if (m) item.replacedFrom = m[1]
		else item.block = textNodesFromMarkdown(src)
		res.push(item)
	}
	for (const item of res) {
		if (item.replacedFrom !== null) {
			const src = res.find(x => x.path === item.replacedFrom)
			if (!src)
				throw new Error(`can not find block '${item.replacedFrom}' for replacement in '${item.path}'`)
			item.block = textNodesFromMarkdown(src.src)
			item.src = src.src
		}
	}
	return res
}

const yamlCache = new Map()
/** @param {string} fpath */
export async function saveYaml(fpath, data) {
	yamlCache.set(fpath, data)
	await fs.mkdir(dirname(fpath), { recursive: true })
	await fs.writeFile(fpath, stringifyYaml(data))
}
/** @param {string} fpath */
async function loadYaml(fpath) {
	if (yamlCache.has(fpath)) return yamlCache.get(fpath)
	return parseYaml(await fs.readFile(fpath, 'utf-8'))
}
/** @param {string} fname */
const saveGeneratedYaml = (fname, data) => saveYaml(`${GENERATED_DATA_DIR}/${fname}.yaml`, data)
/** @param {string} fname */
const loadGeneratedYaml = fname => loadYaml(`${GENERATED_DATA_DIR}/${fname}.yaml`)

/** @param {import('#lib/parsing/helperteam/types').BuildInfo<'monolang'>} builds */
export const saveBuilds = builds => saveGeneratedYaml('builds', builds)
/** @returns {Promise<import('#lib/parsing/helperteam/types').BuildInfo<'monolang'>>} */
export const loadBuilds = () => loadGeneratedYaml('builds')

/** @returns {Promise<import('#lib/parsing/helperteam/types').BuildInfo<'monolang'>>} */
export const loadTranslationReferenceBuilds = () => loadYaml(TRANSLATED_BUILDS_REF_FPATH)

/**
 * @param {import('#lib/parsing/helperteam/types').BuildInfo<'monolang'>} refBuilds
 * @param {import('#lib/parsing/helperteam/types').BuildInfo<'multilang'>} langBuilds
 * @param {string[]} langs
 */
export async function saveTranslatedBuilds(refBuilds, langBuilds, langs) {
	await saveYaml(TRANSLATED_BUILDS_REF_FPATH, refBuilds)
	for (const lang of langs) {
		const blocks = getBuildsFormattedBlocks(langBuilds)
		const content = textBlocksToMarkdown([...blocks].map(([item, path]) => [item[lang] ?? null, path]))
		await fs.writeFile(TRANSLATED_BUILDS_LANG_FPATH(lang), content)
	}
}
/** @returns {Promise<import('#lib/parsing/helperteam/types').BuildInfo<'multilang'>>} */
export async function loadTranslatedBuilds() {
	/** @type {import('#lib/parsing/helperteam/types').BuildInfo<'monolang'>} */
	const refBuilds = await loadYaml(TRANSLATED_BUILDS_REF_FPATH)
	const langBuilds = buildsConvertLangMode(refBuilds, 'multilang', () => ({}))

	const lang2blocks = await loadTranslatedBuildsBlocks()
	const langPath2block = new Map()
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		for (const { block, path } of blocks) {
			langPath2block.set(lang + '|' + path, block)
		}
	}

	for (const [langBlock, path] of getBuildsFormattedBlocks(langBuilds)) {
		for (const lang in lang2blocks) {
			const block = langPath2block.get(lang + '|' + path)
			if (block !== undefined) langBlock[lang] = block
		}
	}
	return langBuilds
}
export async function loadTranslatedBuildsBlocks() {
	const langs = (await fs.readdir(TRANSLATED_BUILDS_DIR))
		.filter(x => x.endsWith('.md'))
		.map(x => x.slice(0, -3))

	/** @type {Record<string, ReturnType<typeof textBlocksFromMarkdown>>} */
	const lang2blocks = {}
	for (const lang of langs) {
		const text = await fs.readFile(TRANSLATED_BUILDS_LANG_FPATH(lang), { encoding: 'utf-8' })
		lang2blocks[lang] = textBlocksFromMarkdown(text)
	}
	return lang2blocks
}

/** @param {import('#lib/parsing').Code2CharacterData} characters */
export const saveCharacters = characters => saveGeneratedYaml('characters', characters)
/** @returns {Promise<import('#lib/parsing').Code2CharacterData>} */
export const loadCharacters = () => loadGeneratedYaml('characters')

/** @param {import('#lib/parsing').Code2ArtifactSetData} artifacts */
export const saveArtifacts = artifacts => saveGeneratedYaml('artifacts', artifacts)
/** @returns {Promise<import('#lib/parsing').Code2ArtifactSetData>} */
export const loadArtifacts = () => loadGeneratedYaml('artifacts')

/** @param {import('#lib/parsing').Code2WeaponData} weapons */
export const saveWeapons = weapons => saveGeneratedYaml('weapons', weapons)
/** @returns {Promise<import('#lib/parsing').Code2WeaponData>} */
export const loadWeapons = () => loadGeneratedYaml('weapons')

/** @param {import('#lib/parsing').Code2DomainData} domains */
export const saveDomains = domains => saveGeneratedYaml('domains', domains)
/** @returns {Promise<import('#lib/parsing').Code2DomainData>} */
export const loadDomains = () => loadGeneratedYaml('domains')

/** @param {import('#lib/parsing').Code2ItemData} items */
export const saveItems = items => saveGeneratedYaml('items', items)
/** @returns {Promise<import('#lib/parsing').Code2ItemData>} */
export const loadItems = () => loadGeneratedYaml('items')

/** @param {import('#lib/parsing').Code2EnemyData} enemies */
export const saveEnemies = enemies => saveGeneratedYaml('enemies', enemies)
/** @returns {Promise<import('#lib/parsing').Code2EnemyData>} */
export const loadEnemies = () => loadGeneratedYaml('enemies')

/** @param {import('#lib/parsing').Code2EnemyGroupData} groups */
export const saveEnemyGroups = groups => saveGeneratedYaml('enemy_groups', groups)
/** @returns {Promise<import('#lib/parsing').Code2EnemyGroupData>} */
export const loadEnemyGroups = () => loadGeneratedYaml('enemy_groups')

/** @param {import('#lib/parsing/akashadata').AbyssStats} abyssStats */
export const saveAbyssStats = abyssStats => saveGeneratedYaml('abyss_stats', abyssStats)
/** @returns {Promise<import('#lib/parsing/akashadata').AbyssStats>} */
export const loadAbyssStats = () => loadGeneratedYaml('abyss_stats')
