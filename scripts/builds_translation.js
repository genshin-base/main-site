#!/usr/bin/env node
import { promises as fs } from 'fs'
import { getBuildsFormattedBlocks } from '#lib/parsing/helperteam/index.js'
import { error, info } from '#lib/utils/logs.js'
import { parseArgs, relativeToCwd } from '#lib/utils/os.js'
import {
	CACHE_DIR,
	GENERATED_DATA_DIR,
	loadBuilds,
	loadTranslationReferenceBuilds,
	textBlocksToMarkdown,
	TRANSLATED_BUILDS_LANG_FPATH,
	TRANSLATED_BUILDS_REF_FPATH,
} from './_common.js'

const args = parseArgs()

function printUsage() {
	console.log(`Usage:
  node ${relativeToCwd(process.argv[1])} --langs=en,ru [-h|--help]`)
}

if (args['--help'] || args['-h']) {
	printUsage()
	process.exit(2)
}

;(async () => {
	if (!args['--langs']) throw new Error('--langs are required')
	const langs = args['--langs'].split(',')

	const textsDir = `${CACHE_DIR}/translation`
	await fs.rm(textsDir, { recursive: true, force: true })
	await fs.mkdir(textsDir, { recursive: true })
	const curBuildsTextFPath = `${textsDir}/builds_current.md`
	const refBuildsTextFPath = `${textsDir}/builds_used_for_translation.md`

	info('loading builds...')
	const curBuilds = await loadBuilds()
	const refBuilds = await loadTranslationReferenceBuilds()

	const charCode2index = new Map(curBuilds.characters.map((x, i) => [x.code, i]))
	const charSortFunc = (a, b) => (charCode2index.get(a.code) ?? 999) - (charCode2index.get(b.code) ?? 999)
	refBuilds.characters.sort(charSortFunc)

	info('saving texts...')
	await fs.writeFile(curBuildsTextFPath, textBlocksToMarkdown([...getBuildsFormattedBlocks(curBuilds)]))
	await fs.writeFile(refBuildsTextFPath, textBlocksToMarkdown([...getBuildsFormattedBlocks(refBuilds)]))

	info('done.')
	info('')
	info('now get diff between:')
	info('  ' + relativeToCwd(refBuildsTextFPath))
	info('  ' + relativeToCwd(curBuildsTextFPath))
	info('apply changes to:')
	for (const lang of langs) info('  ' + relativeToCwd(TRANSLATED_BUILDS_LANG_FPATH(lang)))
	info(
		`and copy ${relativeToCwd(`${GENERATED_DATA_DIR}/builds.yaml`)}` +
			` to ${relativeToCwd(TRANSLATED_BUILDS_REF_FPATH)}`,
	)
	info('')
	info('for VSCode:')
	info(`  code --diff ${relativeToCwd(refBuildsTextFPath)} ${relativeToCwd(curBuildsTextFPath)}`)
	info('  code ' + langs.map(lang => relativeToCwd(TRANSLATED_BUILDS_LANG_FPATH(lang))).join(' '))
	info('  split window with Ctrl+\\')
})().catch(error)
