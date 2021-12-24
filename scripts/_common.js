import yaml from 'yaml'
import { promises as fs } from 'fs'
import { fileURLToPath } from 'url'
import { dirname } from 'path/posix'

const __filename = fileURLToPath(import.meta.url)
export const BASE_DIR = dirname(__filename) + '/..'
export const CACHE_DIR = `${BASE_DIR}/cache`
export const DATA_DIR = `${BASE_DIR}/builds_data`
export const WWW_STATIC_DIR = `${BASE_DIR}/www/src/generated`
export const WWW_DYNAMIC_DIR = `${BASE_DIR}/www/public/generated`
export const WWW_MEDIA_DIR = `${BASE_DIR}/www/public/media`

/**
 * @template T
 * @param {string} fname
 * @param {T} data
 */
async function saveYaml(fname, data) {
	await fs.writeFile(`${DATA_DIR}/${fname}.yaml`, yaml.stringify(data))
}
/**
 * @template T
 * @param {string} fname
 * @returns {Promise<T>}
 */
async function loadYaml(fname) {
	return yaml.parse(await fs.readFile(`${DATA_DIR}/${fname}.yaml`, 'utf-8'))
}

/** @param {import('#lib/parsing/helperteam').BuildInfo} builds */
export const saveBuilds = builds => saveYaml('builds', builds)
/** @returns {Promise<import('#lib/parsing/helperteam').BuildInfo>} */
export const loadBuilds = () => loadYaml('builds')

/** @param {import('#lib/parsing').CharactersInfo} characters */
export const saveCharacters = characters => saveYaml('characters', characters)
/** @returns {Promise<import('#lib/parsing').CharactersInfo>} */
export const loadCharacters = () => loadYaml('characters')

/** @param {import('#lib/parsing').ItemsLangNames} artifacts */
export const saveArtifactsNames = artifacts => saveYaml('artifacts', artifacts)
/** @returns {Promise<import('#lib/parsing').ItemsLangNames>} */
export const loadArtifactNames = () => loadYaml('artifacts')

/** @param {import('#lib/parsing').WeaponsInfo} weapons */
export const saveWeapons = weapons => saveYaml('weapons', weapons)
/** @returns {Promise<import('#lib/parsing').WeaponsInfo>} */
export const loadWeapons = () => loadYaml('weapons')

/** @param {import('#lib/parsing').DomainsInfo} domains */
export const saveDomains = domains => saveYaml('domains', domains)
/** @returns {Promise<import('#lib/parsing').DomainsInfo>} */
export const loadDomains = () => loadYaml('domains')
