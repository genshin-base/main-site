import { getFileCached } from '#lib/requests.js'
import { trigramMustGetWithThresh, trigramSearcherFromStrings } from '#lib/trigrams.js'
import { progress, tryWithContext, warn } from '#lib/utils/logs.js'
import { promises as fs } from 'fs'

/**
 * @typedef {{
 *   mostUsedCharacters: {code:string, use:number}[],
 * }} AbyssStats
 */
export {}

/**
 * @param {string} cacheDir
 * @param {import('#lib/parsing').Code2CharacterData} code2characterData
 * @returns {Promise<AbyssStats>}
 */
export async function extractAbyssStats(cacheDir, code2characterData) {
	let content = await getAbyssFile('abyss_total.js', cacheDir)
	content = content.replace(/^[^{}]*/, '')

	const codeSearcher = trigramSearcherFromStrings(Object.keys(code2characterData))

	const mostUsedCharacters = /**@type {AbyssStats['mostUsedCharacters']}*/ ([])
	for (const item of JSON.parse(content).character_used_list) {
		tryWithContext(`akashadata: character list: ${item.en_name}`, 'skipping', null, () => {
			let name = item.en_name
			if (name === 'shougun') name = 'raiden'
			if (name === 'traveler_girl') name = 'traveler-anemo'
			if (name === 'pingzang') name = 'heizo'
			if (name === 'feiyan') name = 'yanfei'
			if (name === 'sara') name = 'kujou-sara'
			const code = trigramMustGetWithThresh(codeSearcher, name, x => x)

			const { maxstar_person_had_count: hadCount, maxstar_person_use_count: useCount } = item

			if (hadCount > 0) {
				const existsing = mostUsedCharacters.find(x => x.code === code)
				if (existsing) throw new Error(`got same character code '${code}' for two items, overwriting`)
				mostUsedCharacters.push({ code, use: round(useCount / hadCount, 4) })
			}
		})
	}
	mostUsedCharacters.sort((a, b) => b.use - a.use)

	// const missingCharacters = Object.values(code2characterData).filter(
	// 	char => !char.code.startsWith('traveler-') && !mostUsedCharacters.some(x => x.code === char.code),
	// )
	// if (missingCharacters.length > 0)
	// 	warn('akashadata: no teams with character(s): ' + missingCharacters.map(x => x.code).join(', '))

	return { mostUsedCharacters }
}

const ORIGIN = 'https://akashadata.feixiaoqiu.com'

/**
 * @param {string} path
 * @param {string} cacheDir
 * @returns {Promise<string>}
 */
async function getAbyssFile(path, cacheDir) {
	await fs.mkdir(`${cacheDir}/akashadata`, { recursive: true })

	const url = `${ORIGIN}/static/data/${path}`
	const fpath = `${cacheDir}/akashadata/_${path.replace(/\//g, '-')}`
	const cacheUsed = await getFileCached(url, null, fpath, false, Infinity)

	if (!cacheUsed) progress()
	return await fs.readFile(fpath, { encoding: 'utf-8' })
}

/**
 * @param {number} val
 * @param {number} n
 */
function round(val, n) {
	n = 10 ** n
	return Math.round(val * n) / n
}
