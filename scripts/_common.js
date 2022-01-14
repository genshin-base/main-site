import yaml from 'yaml'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path/posix'

const __filename = fileURLToPath(import.meta.url)
export const BASE_DIR = dirname(__filename) + '/..'
export const CACHE_DIR = `${BASE_DIR}/cache`
export const DATA_CACHE_DIR = `${CACHE_DIR}/data`
export const IMGS_CACHE_DIR = `${CACHE_DIR}/imgs`
export const DATA_DIR = `${BASE_DIR}/data`
export const WWW_STATIC_DIR = `${BASE_DIR}/www/src/generated`
export const WWW_DYNAMIC_DIR = `${BASE_DIR}/www/public/generated`
export const WWW_MEDIA_DIR = `${BASE_DIR}/www/public/media`

/**
 * @param {string} dirpath
 * @param {boolean} clear
 */
export async function prepareCacheDir(dirpath, clear) {
	if (clear) await fs.rm(dirpath, { recursive: true, force: true })
	await fs.mkdir(dirpath, { recursive: true })
}

const yamlCache = new Map()
/**
 * @template T
 * @param {string} fname
 * @param {T} data
 */
async function saveYaml(fname, data) {
	yamlCache.set(fname, data)
	await fs.writeFile(`${DATA_DIR}/${fname}.yaml`, yaml.stringify(data))
}
/**
 * @template T
 * @param {string} fname
 * @returns {Promise<T>}
 */
async function loadYaml(fname) {
	if (yamlCache.has(fname)) return yamlCache.get(fname)
	return yaml.parse(await fs.readFile(`${DATA_DIR}/${fname}.yaml`, 'utf-8'))
}

/** @param {import('#lib/parsing/helperteam').BuildInfo} builds */
export const saveBuilds = builds => saveYaml('builds', builds)
/** @returns {Promise<import('#lib/parsing/helperteam').BuildInfo>} */
export const loadBuilds = () => loadYaml('builds')

/** @param {import('#lib/parsing').Code2CharacterData} characters */
export const saveCharacters = characters => saveYaml('characters', characters)
/** @returns {Promise<import('#lib/parsing').Code2CharacterData>} */
export const loadCharacters = () => loadYaml('characters')

/** @param {import('#lib/parsing').Code2ArtifactSetData} artifacts */
export const saveArtifacts = artifacts => saveYaml('artifacts', artifacts)
/** @returns {Promise<import('#lib/parsing').Code2ArtifactSetData>} */
export const loadArtifacts = () => loadYaml('artifacts')

/** @param {import('#lib/parsing').Code2WeaponData} weapons */
export const saveWeapons = weapons => saveYaml('weapons', weapons)
/** @returns {Promise<import('#lib/parsing').Code2WeaponData>} */
export const loadWeapons = () => loadYaml('weapons')

/** @param {import('#lib/parsing').Code2DomainData} domains */
export const saveDomains = domains => saveYaml('domains', domains)
/** @returns {Promise<import('#lib/parsing').Code2DomainData>} */
export const loadDomains = () => loadYaml('domains')

/** @param {import('#lib/parsing').Code2ItemData} items */
export const saveItems = items => saveYaml('items', items)
/** @returns {Promise<import('#lib/parsing').Code2ItemData>} */
export const loadItems = () => loadYaml('items')

/** @param {import('#lib/parsing').Code2EnemyData} enemies */
export const saveEnemies = enemies => saveYaml('enemies', enemies)
/** @returns {Promise<import('#lib/parsing').Code2EnemyData>} */
export const loadEnemies = () => loadYaml('enemies')
