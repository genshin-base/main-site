#!/usr/bin/env node
import { promises as fs } from 'fs'
import { getBuildsFormattedBlocks } from '#lib/parsing/helperteam/index.js'
import { error, fatal, info } from '#lib/utils/logs.js'
import { parseArgs, relativeToCwd } from '#lib/utils/os.js'
import {
	CACHE_DIR,
	GENERATED_DATA_DIR,
	loadArtifacts,
	loadBuilds,
	loadItems,
	loadTranslatedBuildsBlocks,
	loadTranslationReferenceBuilds,
	loadWeapons,
	textBlocksSrcToMarkdown,
	textBlocksToMarkdown,
	TRANSLATED_BUILDS_LANG_FPATH,
	TRANSLATED_BUILDS_REF_FPATH,
} from './_common.js'
import { walkTextNodes } from '#lib/parsing/helperteam/text.js'
import { trigramMustGetWithThresh, TrigramSearcher } from '#lib/trigrams.js'
import { ART_GROUP_18_ATK_CODE, ART_GROUP_20_ER_CODE } from '#lib/genshin.js'

const args = parseArgs()
const needHelp = args['--help'] || args['-h']
const thisScript = `node ${relativeToCwd(process.argv[1])}`

function printUsage() {
	console.log(`Usage:
  ${thisScript} <${Object.keys(commands).join('|')}> [-h|--help]`)
}

const commands = { changes, verify, 'autofill-links': autofillLinks }

;(async () => {
	if (args['cmd'] in commands) {
		await commands[args['cmd']]()
	} else {
		printUsage()
		process.exit(needHelp ? 2 : 1)
	}
})().catch(fatal)

async function changes() {
	if (needHelp) {
		console.log(`Usage:
  ${thisScript} changes --langs=en,ru [-h|--help]`)
		process.exit(2)
	}
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

	curBuilds.characters.sort((a, b) => a.code.localeCompare(b.code))
	refBuilds.characters.sort((a, b) => a.code.localeCompare(b.code))

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
	info('verify the result:')
	info(`  ${thisScript} verify --ref=generated`)
	info(
		`and copy ${relativeToCwd(`${GENERATED_DATA_DIR}/builds.yaml`)}` +
			` to ${relativeToCwd(TRANSLATED_BUILDS_REF_FPATH)}`,
	)
	info('')
	info('for VSCode:')
	info(`  code --diff ${relativeToCwd(refBuildsTextFPath)} ${relativeToCwd(curBuildsTextFPath)}`)
	info('  code ' + langs.map(lang => relativeToCwd(TRANSLATED_BUILDS_LANG_FPATH(lang))).join(' '))
	info('  split window with Ctrl+\\')
}

async function autofillLinks() {
	if (needHelp) {
		console.log(`Usage:
  ${thisScript} autofill-links [-h|--help]`)
		process.exit(2)
	}

	info(`loading builds translations...`)
	const lang2blocks = await loadTranslatedBuildsBlocks()
	const langs = Object.keys(lang2blocks)

	info(`reading items data...`)
	/**
	 * @template {{code:string, name:Record<string,string>}} T
	 * @param {Record<string, T>} code2item
	 */
	function makeSearcher(code2item, type) {
		const s = /**@type {TrigramSearcher<{name:string, code:string}>}*/ (new TrigramSearcher())
		for (const item of Object.values(code2item))
			for (const lang of langs) {
				if (!(lang in item.name)) {
					error(`${type} '${item.code}' has no ${lang}-name`)
					process.exit(1)
				}
				s.add(item.name[lang], { name: item.name[lang], code: item.code })
			}
		return s
	}
	const searchers = {
		artifacts: makeSearcher(await loadArtifacts(), 'artifact'),
		weapons: makeSearcher(await loadWeapons(), 'weapon'),
		items: makeSearcher(await loadItems(), 'item'),
	}
	for (const code of [ART_GROUP_18_ATK_CODE, ART_GROUP_20_ER_CODE])
		searchers.artifacts.add(code, { name: code, code })

	info('searching special links...')
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		for (const block of blocks) {
			const replaces = []

			const linkRe = /(?<!\\)\[(.+?)(?<!\\)\]\((.+?)\)/g
			let res
			while ((res = linkRe.exec(block.src)) !== null) {
				const full = res[0]
				const label = res[1].trim()
				const query = label.replace(/\s*\(\d+\)$/, '') //cut '... (2)'
				const href = res[2].trim()

				function add(searcher, prefix) {
					try {
						const code = trigramMustGetWithThresh(searcher, query, x => x.name).code
						replaces.push({ index: res.index, length: full.length, label, href: prefix + code })
					} catch (ex) {
						throw new Error(
							`texts: ${lang}: block '${block.path}': can not find item: ` + ex.message,
						)
					}
				}

				if (href === '#weapon') {
					add(searchers.weapons, '#weapon:')
				} else if (href === '#artifact') {
					add(searchers.artifacts, '#artifact:')
				} else if (href === '#item') {
					add(searchers.items, '#item:')
				}
			}
			for (const { index, length, label, href } of replaces.reverse()) {
				info(`${href}\t<- ${label}`)
				const link = `[${label}](${href})`
				block.src = block.src.slice(0, index) + link + block.src.slice(index + length)
			}
		}
	}

	info('saving files...')
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		const content = textBlocksSrcToMarkdown(blocks)
		await fs.writeFile(TRANSLATED_BUILDS_LANG_FPATH(lang), content)
	}

	info('done.')
}

async function verify() {
	if (needHelp) {
		console.log(`Usage:
  ${thisScript} verify [--ref=generated] [-h|--help]`)
		process.exit(2)
	}

	const refBuilds =
		args['--ref'] === 'generated' ? await loadBuilds() : await loadTranslationReferenceBuilds()
	const lang2blocks = await loadTranslatedBuildsBlocks()

	const langs = Object.keys(lang2blocks)
	info(`found langs: ${langs}`)

	let errored = false
	function err(msg) {
		error(msg)
		errored = true
	}

	// дублирование блоков
	const lang2blockMaps = Object.fromEntries(langs.map(x => [x, new Map()]))
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		for (const { block, path } of blocks) {
			if (lang2blockMaps[lang].has(path)) err(`${lang}: block '${path}' appears multiple times`)
			lang2blockMaps[lang].set(path, block)
		}
	}

	// пропущенные блоки (есть текст в исходнике, нет в переводах)
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		const usedPaths = new Set(blocks.map(x => x.path))
		for (const [block, path] of getBuildsFormattedBlocks(refBuilds)) {
			if (block === null) continue
			if (!usedPaths.has(path)) err(`${lang}: block '${path}' missing in translation`)
		}
	}

	// полупереведённые блоки (есть не для каждого языка)
	for (const [, path] of getBuildsFormattedBlocks(refBuilds)) {
		const missingLangs = langs.filter(x => !lang2blockMaps[x].has(path))
		if (missingLangs.length > 0 && missingLangs.length < langs.length) {
			err(`block '${path}': not found for langs: ${missingLangs}`)
		}
	}

	// неиспользованные блоки
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		const unusedPaths = new Set(blocks.map(x => x.path))
		for (const [, path] of getBuildsFormattedBlocks(refBuilds)) {
			unusedPaths.delete(path)
		}
		for (const path of unusedPaths) {
			err(`${lang}: block '${path}': is unused`)
		}
	}

	const artifacts = await loadArtifacts()
	const weapons = await loadWeapons()
	const items = await loadItems()

	// for (const [lang, blocks] of Object.entries(lang2blocks)) {
	// 	for (const { src, path } of blocks) {
	// 		const linkRe = /(?<!\\)\[(.+?)(?<!\\)\]\((.+?)\)/g
	// 		let res
	// 		while ((res = linkRe.exec(src)) !== null) {
	// 			const [, text, href] = res
	// 		}
	// 	}
	// }

	// корректность кодов в ссылках на предметы
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		for (const { block, path } of blocks) {
			for (const node of walkTextNodes(block)) {
				if (typeof node !== 'string' && 'a' in node) {
					if (node.href.trim().startsWith('#')) {
						const linkStr = `[${node.a}](${node.href})`
						let m
						if ((m = node.href.match(/#weapon:(.*)/))) {
							if (!(m[1] in weapons))
								err(`${lang}: block '${path}': wrong weapon code: ${linkStr}`)
						} else if ((m = node.href.match(/#artifact:(.*)/))) {
							if (!(m[1] in artifacts))
								err(`${lang}: block '${path}': wrong artifact code: ${linkStr}`)
						} else if ((m = node.href.match(/#item:(.*)/))) {
							if (!(m[1] in items)) err(`${lang}: block '${path}': wrong item code: ${linkStr}`)
						} else {
							err(`${lang}: block '${path}': wrong special link: ${linkStr}`)
						}
					}
				}
			}
		}
	}

	info('done, ' + (errored ? 'with errors' : 'seems OK.'))
	if (errored) process.exit(1)
}
