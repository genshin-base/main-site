import { promises as fs } from 'fs'
import { getFileCached } from '#lib/requests.js'
import { progress, warn } from '#lib/utils/logs.js'

export { extractCharactersData } from './characters.js'
export { extractArtifactsData } from './artifacts.js'
export { extractWeaponsData } from './weapons.js'
export { extractDomainsData } from './domains.js'

/**
 * @param {import('./common').Code2ImageUrl} imgs
 * @param {string} cacheDir
 * @param {string} cacheGroup
 * @param {(code:string) => Promise<undefined|((srcFPath:string) => Promise<unknown>)>} imageFunc
 */
export async function getAndProcessMappedImages(imgs, cacheDir, cacheGroup, imageFunc) {
	const imgsCacheDir = `${cacheDir}/honeyhunter/${cacheGroup}`
	await fs.mkdir(imgsCacheDir, { recursive: true })

	const stats = { loaded: 0, total: imgs.size }
	for (const [code, url] of imgs.entries()) {
		const loadFunc = await imageFunc(code)
		if (!loadFunc) continue

		const cacheFPath = `${imgsCacheDir}/${url.replace(/[:/]/g, '_')}`

		try {
			await getFileCached(url, null, cacheFPath, false, Infinity)
		} catch (ex) {
			warn(`can not get image for '${code}' artifact: ${ex}`)
			continue
		}

		await loadFunc(cacheFPath)
		stats.loaded++
		progress()
	}
	return stats
}
