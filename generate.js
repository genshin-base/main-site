#!/bin/node
import { promises as fs } from 'fs'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { extractBuildsFromODS } from './lib/ods.js'
import { getFileCached } from './lib/requests.js'

const __filename = fileURLToPath(import.meta.url)
const baseDir = dirname(__filename)
const CACHE_DIR = `${baseDir}/cache`

const DOC_ID = '1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI'

;(async () => {
	await fs.mkdir(CACHE_DIR, { recursive: true })

	const docFPath = `${CACHE_DIR}/spreadsheet.odt`
	const url = `https://docs.google.com/spreadsheets/export?id=${DOC_ID}&exportFormat=ods`
	await getFileCached(url, null, docFPath, true, Infinity)

	const buildInfo = await extractBuildsFromODS(docFPath)

	console.log(buildInfo)

	console.log('')
	for (const [elem, info] of Object.entries(buildInfo.elementMap)) {
		console.log(elem)
		for (const char of info)
			console.log(
				'  ' +
					(char.name + ': ').padEnd(12) +
					char.roles.map(x => x.name + (x.isBest ? '+' : '')).join(', '),
			)
	}

	console.log('')
	console.log('changes')
	for (const row of buildInfo.changelogsTable.rows.slice(0, 3)) {
		console.log('  ' + row.date + '   applied by ' + row.appliedBy)
	}

	// setTimeout(() => {}, 1000000)
})().catch(console.error)
