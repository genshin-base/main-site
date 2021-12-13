#!/bin/node
import { promises as fs } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { extractBuildsFromODS } from '../lib/builds/index.js'
import { getFileCached } from '../lib/requests.js'
import yaml from 'yaml'
import { loadSpreadsheetCached } from '../lib/google.js'

const __filename = fileURLToPath(import.meta.url)
const baseDir = dirname(__filename) + '/..'
const CACHE_DIR = `${baseDir}/cache`
const DATA_DIR = `${baseDir}/builds_data`

const DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

/** @type {import('../lib/builds/utils.js').BuildsExtractionFixes} */
const fixes = {
	charactersArtifactsMatch: [
		{
			characterCodes: ['rosaria'],
			replace: /Lavawalkers Epiphany/i,
			with: 'lavawalker',
		},
		{
			characterCodes: ['diona', 'qiqi', 'sayu'],
			replace: /Maiden's Beloved/i,
			with: 'maiden beloved',
		},
	],
}

;(async () => {
	await fs.mkdir(CACHE_DIR, { recursive: true })

	const docFPath = `${CACHE_DIR}/spreadsheet.odt`
	const docUrl = `https://docs.google.com/spreadsheets/export?id=${DOC_ID}&exportFormat=ods`
	await getFileCached(docUrl, null, docFPath, true, Infinity)

	const jsonFPath = `${CACHE_DIR}/spreadsheets.json`
	await loadSpreadsheetCached(
		`${baseDir}/google.private_key.json`,
		`${CACHE_DIR}/google.access_token.json`,
		jsonFPath,
		DOC_ID,
		[
			'sheets.properties',
			'sheets.data.rowData.values.userEnteredValue',
			'sheets.data.rowData.values.userEnteredFormat.textFormat',
		],
	)

	fixes.charactersArtifactsMatch.forEach(x => (x._used = false))

	const buildInfo = await extractBuildsFromODS(docFPath, jsonFPath, fixes)

	fixes.charactersArtifactsMatch
		.filter(x => !x._used)
		.forEach((x, i) =>
			console.warn(`WARN: fixes.charactersArtifactsMatch[${i}] (${x.replace}) was not used`),
		)

	// console.log(buildInfo)

	// console.log('')
	// for (const [elem, info] of Object.entries(buildInfo.elementMap)) {
	// 	console.log(elem)
	// 	for (const char of info)
	// 		console.log(
	// 			'  ' +
	// 				(char.name + ': ').padEnd(12) +
	// 				char.roles.map(x => x.name + (x.isBest ? '+' : '')).join(', '),
	// 		)
	// }

	// console.log('')
	// console.log('changes')
	// for (const row of buildInfo.changelogsTable.rows.slice(0, 3)) {
	// 	console.log('  ' + row.date + '   applied by ' + row.appliedBy)
	// }

	console.log('')
	// console.log(yaml.stringify(buildInfo.elementMap['pyro']))
	// console.log(JSON.stringify(buildInfo.elementMap))

	await fs.mkdir(DATA_DIR, { recursive: true })
	await fs.writeFile(`${DATA_DIR}/generated.yaml`, yaml.stringify(buildInfo))

	// setTimeout(() => {}, 1000000)
})().catch(console.error)
