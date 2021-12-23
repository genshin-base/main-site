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
 * @param {string} prefix
 * @param {import('#lib/parsing').ItemsLangNames} names
 */
export async function saveNames(prefix, names) {
	await fs.writeFile(`${DATA_DIR}/${prefix}_names.yaml`, yaml.stringify(names))
}
/**
 * @param {string} prefix
 * @returns {Promise<import('#lib/parsing').ItemsLangNames>}
 */
export async function loadNames(prefix) {
	return yaml.parse(await fs.readFile(`${DATA_DIR}/${prefix}_names.yaml`, 'utf-8'))
}

/** @param {import('#lib/parsing/helperteam').BuildInfo} builds */
export async function saveBuilds(builds) {
	await fs.writeFile(`${DATA_DIR}/builds.yaml`, yaml.stringify(builds))
}
/** @returns {Promise<import('#lib/parsing/helperteam').BuildInfo>} */
export async function loadBuilds() {
	return yaml.parse(await fs.readFile(`${DATA_DIR}/builds.yaml`, 'utf-8'))
}

export const saveCharactersNames = saveNames.bind(null, 'character')
export const loadCharacterNames = loadNames.bind(null, 'character')

export const saveArtifactsNames = saveNames.bind(null, 'artifact')
export const loadArtifactNames = loadNames.bind(null, 'artifact')

export const saveWeaponsNames = saveNames.bind(null, 'weapon')
export const loadWeaponNames = loadNames.bind(null, 'weapon')

/** @param {import('#lib/parsing/honeyhunter').DomainsInfo} domains */
export async function saveDomains(domains) {
	await fs.writeFile(`${DATA_DIR}/domains.yaml`, yaml.stringify(domains))
}
/** @returns {Promise<import('#lib/parsing/honeyhunter').DomainsInfo>} */
export async function loadDomains() {
	return yaml.parse(await fs.readFile(`${DATA_DIR}/domains.yaml`, 'utf-8'))
}
