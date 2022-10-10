import { getCharacterCodeFromName } from '#lib/genshin.js'
import { getFileCached } from '#lib/requests.js'
import { trigramSearcherFromStrings } from '#lib/trigrams.js'
import { progress, warn } from '#lib/utils/logs.js'
import { parseXmlStream, searchNodeWithTag } from '#lib/xml.js'
import { createReadStream, promises as fs } from 'fs'
import { tryFixCode } from '#lib/parsing/helperteam/common.js'
import { sortCharacterCodes, compareReleaseVersions, compareCharacters } from '#lib/parsing/sorting.js'

/**
 * @typedef {{
 *   mostUsedTeams: {codes:string[], use:number}[],
 *   mostUsedCharacters: {code:string, use:number}[],
 * }} AbyssStats
 */

/**
 * @param {string} cacheDir
 * @param {import('#lib/parsing').Code2CharacterData} code2characterData
 * @returns {Promise<AbyssStats>}
 */
export async function extractAbyssStats(cacheDir, code2characterData) {
	const fpath = await getAbyssFile('', cacheDir)

	const html = await fs.readFile(fpath, { encoding: 'utf-8' })
	const m = html.match(/"buildId":\s*"(.+?)"/)
	if (!m) throw new Error('spiralabyss: counld not find build id on page (smth like "buildId":"abc")')
	const buildId = m[1]
	progress()

	const id2characterCode = /**@type {Map<number,string>}*/ (new Map())
	const charCodeSearcher = trigramSearcherFromStrings(Object.keys(code2characterData))
	const root = await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
	searchNodeWithTag(root, 'img', node => {
		const m = node.attrs.src?.match(/\/avatars\/(\d+)\.png$/)
		if (!m) return false

		const id = m[1]
		const name = node.attrs.alt ?? node.attrs.title
		if (!name) return false

		let code = getCharacterCodeFromName(name)
		if (code === 'shougun') code = 'raiden-shogun'
		if (code === 'sara') code = 'kujou-sara'
		if (code === 'yae') code = 'yae-miko'
		if (code === 'traveler') code = 'travelter-anemo'
		code = tryFixCode(charCodeSearcher, code, 'spiralabyss')

		id2characterCode.set(+id, code)
		return false
	})

	// most used characters

	const url = `_next/data/${buildId}/en.json`
	const charactersData = await getAbyssJson(url, cacheDir)
	const characterStats = decodeData(charactersData.pageProps.FDR)
	const mostUsedCharacters = Object.keys(characterStats.deploy_count)
		.map(id => {
			const code = id2characterCode.get(parseInt(id))
			if (!code) throw new Error(`spiralabyss: unkown character id '${id}'`)
			const use = round(characterStats.deploy_count[id] / characterStats.roles_count[id], 4)
			return { code, use }
		})
		.sort(
			(a, b) =>
				b.use - a.use || compareCharacters(code2characterData[a.code], code2characterData[b.code]),
		)

	// most used teams

	const teamSums = /**@type {Map<string, number>}*/ (new Map())
	for (let floorNum = 9; floorNum <= 12; floorNum++) {
		const url = `_next/data/${buildId}/en/floor-${floorNum}.json`
		const floorData = await getAbyssJson(url, cacheDir)
		if (floorData?.pageProps?.floor !== floorNum)
			throw new Error(
				`spiralabyss: requested floor#${floorNum} data, got #${floorData?.pageProps?.floor}`,
			)

		/** @type {Record<string, number>} */
		const teams = decodeData(floorData.pageProps.FDR).best_combo
		for (const [teamsStr, count] of Object.entries(teams)) {
			for (let teamStr of teamsStr.split(';')) {
				teamStr = teamStr.split('_').sort().join('_')
				teamSums.set(teamStr, (teamSums.get(teamStr) ?? 0) + count)
			}
		}
	}
	const mostUsedTeams = Array.from(teamSums.entries(), ([teamStr, count]) => {
		const ids = teamStr.split('_').map(id => 10000000 + parseInt(id))
		const codes = ids.map(id => {
			const code = id2characterCode.get(id)
			if (!code) throw new Error(`spiralabyss: unkown character id '${id}'`)
			return code
		})
		sortCharacterCodes(codes, code2characterData)
		// корректируем встречаемость команды по количесту игроков, к уоторых есть самый редки персонаж из этой команды
		const minPlayersCount = Math.min(...ids.map(id => characterStats.roles_count[id]))
		const use = round(count / minPlayersCount, 5)
		return { codes, use }
	})
		.filter(x => x.codes.length === 4)
		.sort((a, b) => b.use - a.use || a.codes[0].localeCompare(b.codes[0]))
	const top25use = mostUsedTeams[(mostUsedTeams.length * 0.25) | 0].use
	while (mostUsedTeams.length > 0 && mostUsedTeams[mostUsedTeams.length - 1].use < top25use)
		mostUsedTeams.pop()

	const lastVersion = Object.values(code2characterData)
		.map(x => x.releaseVersion)
		.sort(compareReleaseVersions)
		.reverse()[0]
	const codesAllButLast = new Set(
		Object.values(code2characterData)
			.filter(x => x.releaseVersion !== lastVersion && !x.code.startsWith('traveler-'))
			.map(x => x.code),
	)
	for (const team of mostUsedTeams) for (const code of team.codes) codesAllButLast.delete(code)
	if (codesAllButLast.size > 0) warn(`spiralabyss: no teams with character(s) ${[...codesAllButLast]}`)

	return { mostUsedTeams, mostUsedCharacters }
}

/** @param {string} str */
function decodeData(str) {
	const alphabet = {
		d5: 'Ul1RXjD4wu,{pxO_NLC7MPmVqJ6Y3"SyHE2509FaAvnIhzresZ-oicTgKtbB:8k}GQWfd',
		d8: 'LnWIAKabSVTBCUdZxRtH1-8rhksfqjGoQ6FJ9:NXY57EDcie0lMyP"zpgmOu2_v3,}4{w',
	}
	const a0 = alphabet.d5
	const a1 = alphabet.d8
	const oLookup = {}
	a1.split('').forEach((char, i) => {
		oLookup[char] = a0.charAt(i)
	})

	let decoded = ''
	for (let i = 0; i < str.length; i++) decoded += oLookup[str[i]] ?? str[i]
	return JSON.parse(decoded)
}

/**
 * @param {number} val
 * @param {number} n
 */
function round(val, n) {
	n = 10 ** n
	return Math.round(val * n) / n
}

const ORIGIN = 'https://spiralabyss.org'

/**
 * @param {string} path
 * @param {string} cacheDir
 * @returns {Promise<string>}
 */
async function getAbyssFile(path, cacheDir) {
	await fs.mkdir(`${cacheDir}/spiralabyss`, { recursive: true })

	const url = `${ORIGIN}/${path}`
	const fpath = `${cacheDir}/spiralabyss/_${path.replace(/\//g, '-')}`
	const cacheUsed = await getFileCached(url, null, fpath, false, Infinity)

	if (!cacheUsed) progress()
	return fpath
}
// /**
//  * @param {string} path
//  * @param {string} cacheDir
//  * @returns {Promise<import('#lib/xml').Node>}
//  */
// async function getAbyssPage(path, cacheDir) {
// 	const fpath = await getAbyssFile(path, cacheDir)
// 	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
// }
/**
 * @param {string} path
 * @param {string} cacheDir
 * @returns {Promise<any>}
 */
async function getAbyssJson(path, cacheDir) {
	const fpath = await getAbyssFile(path, cacheDir)
	return JSON.parse(await fs.readFile(fpath, { encoding: 'utf-8' }))
}
