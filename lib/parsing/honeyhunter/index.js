import { promises as fs } from 'fs'
import { getFileCached, UnexpectedStatusError } from '#lib/requests.js'
import { progress, warn } from '#lib/utils/logs.js'
import { magick } from '#lib/media.js'

export { extractCharactersData } from './characters.js'
export { extractArtifactsData } from './artifacts.js'
export { extractWeaponsData } from './weapons.js'
export { extractDomainsData } from './domains.js'

/**
 * @param {import('./common').Code2ImageUrl} imgs
 * @param {string} cacheDir
 * @param {string} cacheGroup
 * @param {(code:string) => AsyncGenerator<(srcFPath:string) => Promise<unknown>, void, void>} imagesGen
 */
export async function getAndProcessMappedImages(imgs, cacheDir, cacheGroup, imagesGen) {
	const imgsCacheDir = `${cacheDir}/honeyhunter/${cacheGroup}`
	await fs.mkdir(imgsCacheDir, { recursive: true })

	const stats = { loaded: 0, total: imgs.size }
	for (const [code, url] of imgs.entries()) {
		let wasLoaded = false
		for await (const loadFunc of imagesGen(code)) {
			const cacheFPath = `${imgsCacheDir}/${url.replace(/[:/]/g, '_')}`

			if (!wasLoaded) {
				let err = await tryLoadAsIs(cacheFPath, url)
				if (err instanceof UnexpectedStatusError) {
					warn(`can not load png image for '${code}', trying webp`)
					const cacheFPathTmp = cacheFPath + '.tmp'
					err = await tryLoadAsIs(cacheFPathTmp, url.replace(/png$/, 'webp'))
					if (err === null) {
						await magick(cacheFPathTmp, cacheFPath, [], 'png')
						await fs.unlink(cacheFPathTmp)
					}
				}
				if (err === null) {
					wasLoaded = true
					stats.loaded++
				} else {
					warn(`can not get image for '${code}' artifact: ${err}`)
					break
				}
			}

			await loadFunc(cacheFPath)
			progress()
		}
	}
	return stats
}

async function tryLoadAsIs(cacheFPath, url) {
	try {
		await getFileCached(url, null, cacheFPath, false, Infinity)
		return null
	} catch (ex) {
		return ex
	}
}
