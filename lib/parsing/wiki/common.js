import { createReadStream, promises as fs } from 'fs'
import { getFileCached } from '#lib/requests.js'
import { progress } from '#lib/utils/logs.js'
import { parseXmlStream } from '#lib/xml.js'

const ORIGIN = `https://genshin-impact.fandom.com`

/**
 * @param {string} path
 * @param {string} cacheDir
 * @param {string} lang
 * @returns {Promise<import('#lib/xml').Node>}
 */
export async function getWikiPage(path, cacheDir, lang) {
	await fs.mkdir(`${cacheDir}/wiki`, { recursive: true })
	const url = `${ORIGIN}/${lang === 'en' ? '' : lang + '/'}wiki/${path}`
	const fpath = `${cacheDir}/wiki/${path.replace(/\//g, '-')}-${lang}.html`
	const cacheUsed = await getFileCached(url, null, fpath, false, Infinity)
	if (!cacheUsed) progress()
	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}
