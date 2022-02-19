import yaml from 'yaml'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { stringifyString, YAMLError } from 'yaml/util'
import { GI_MAP_CODES } from '#lib/genshin.js'
import { error } from '#lib/utils/logs.js'

const __filename = fileURLToPath(import.meta.url)
export const BASE_DIR = dirname(__filename) + '/..'
export const CACHE_DIR = `${BASE_DIR}/cache`
export const DATA_CACHE_DIR = `${CACHE_DIR}/data`
export const IMGS_CACHE_DIR = `${CACHE_DIR}/imgs`
export const DATA_DIR = `${BASE_DIR}/data`
export const GENERATED_DATA_DIR = `${DATA_DIR}/generated`
export const TRANSLATED_DATA_DIR = `${DATA_DIR}/translated`
export const WWW_API_FILE = `${BASE_DIR}/www/src/api/generated.js`
export const WWW_DYNAMIC_DIR = `${BASE_DIR}/www/public/generated`
export const WWW_MEDIA_DIR = `${BASE_DIR}/www/public/media`

const location = {
	tag: '!loc',
	identify: val => typeof val === 'object' && val !== null && 'mapCode' in val && 'x' in val && 'y' in val,
	stringify(item, ctx, onComment, onChompKeep) {
		const { mapCode, x, y } = /**@type {import('#lib/genshin').MapLocation}*/ (item.value)
		item = { value: `${mapCode} ${x} ${y}` }
		return stringifyString(item, ctx, onComment, onChompKeep)
	},
	resolve(doc, node) {
		const [mapCode, xStr, yStr, ...rem] = node.strValue.split(' ')
		const x = parseFloat(xStr)
		const y = parseFloat(yStr)
		if (GI_MAP_CODES.includes(mapCode) && !isNaN(x) && !isNaN(y) && rem.length === 0)
			return /**@type {import('#lib/genshin').MapLocation}*/ ({ mapCode, x, y })
		throw new Error('wrong location: ' + node.strValue)
	},
}
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
	try {
		return yaml.parse(content, { customTags })
	} catch (ex) {
		if (ex instanceof YAMLError) {
			const lineNum = pos => content.slice(0, pos).split('\n').length
			error(ex.message)
			if (ex.source?.['resolved']) error(`  value: ${(ex.source?.['resolved'] + '').trim()}`)
			if (ex.source?.range)
				error(`  lines ${lineNum(ex.source.range.start)}-${lineNum(ex.source.range.end)}`)
			process.exit(1)
		} else throw ex
	}
}
/**
 * @param {any} data
 * @returns {string}
 */
export function stringifyYaml(data) {
	return yaml.stringify(data, { customTags })
}

const yamlCache = new Map()
/** @param {string} fpath */
async function saveYaml(fpath, data) {
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

/** @param {import('#lib/parsing/helperteam/types').ChangelogsTable} builds */
export const saveBuildChangelogs = builds => saveGeneratedYaml('build_changelogs', builds)
/** @returns {Promise<import('#lib/parsing/helperteam/types').ChangelogsTable>} */
export const loadBuildChangelogs = () => loadGeneratedYaml('build_changelogs')

/** @param {import('#lib/parsing/helperteam/types').BuildInfo<'multilang'>} builds */
export async function saveTranslatedBuilds(builds) {
	const dirpath = `${TRANSLATED_DATA_DIR}/builds`
	await fs.mkdir(`${dirpath}/characters`, { recursive: true })
	for (const character of builds.characters)
		await fs.writeFile(`${dirpath}/characters/${character.code}.yaml`, stringifyYaml(character))
}
/** @returns {Promise<import('#lib/parsing/helperteam/types').BuildInfo<'multilang'>>} */
export async function loadTranslatedBuilds() {
	const dirpath = `${TRANSLATED_DATA_DIR}/builds`
	return {
		characters: await Promise.all(
			(await fs.readdir(`${dirpath}/characters`)).map(x => loadYaml(`${dirpath}/characters/${x}`)),
		),
	}
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
