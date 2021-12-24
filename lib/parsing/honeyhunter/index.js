import { promises as fs } from 'fs'
import { getFileCached } from '#lib/requests.js'
import { warn } from '#lib/utils.js'

export { extractCharactersData } from './characters.js'
export { extractArtifactsData } from './artifacts.js'
export { extractWeaponsData } from './weapons.js'
export { extractDomainsData } from './domains.js'

/**
 * @param {import('./common').Code2ImageUrl} imgs
 * @param {string} cacheDir
 * @param {string} cacheGroup
 * @param {(srcFPath:string, code:string) => Promise<unknown>} imageFunc
 */
export async function getAndProcessItemImages(imgs, cacheDir, cacheGroup, imageFunc) {
	const imgsCacheDir = `${cacheDir}/honeyhunter/imgs/${cacheGroup}`
	await fs.mkdir(imgsCacheDir, { recursive: true })

	for (const [code, url] of imgs.entries()) {
		const cacheFPath = `${imgsCacheDir}/${code}.png`

		try {
			await getFileCached(url, null, cacheFPath, false, Infinity)
		} catch (ex) {
			warn(`can not get image for '${code}' artifact: ${ex}`)
			continue
		}

		await imageFunc(cacheFPath, code)
	}
}
