#!/usr/bin/env node
import { promises as fs } from 'fs'
import { getBuildsFormattedBlocks } from '#lib/parsing/helperteam/build_texts.js'
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
import { textNodesToMarkdown } from '#lib/parsing/helperteam/text-markdown.js'
import { trigramMustGetWithThresh, TrigramSearcher } from '#lib/trigrams.js'
import { GI_ARTIFACT_GROUP_CODES } from '#lib/genshin.js'

const args = parseArgs()
const needHelp = args['--help'] || args['-h']
const thisScript = `node ${relativeToCwd(process.argv[1])}`

function printUsage() {
	console.log(`Usage:
  ${thisScript} <${Object.keys(commands).join('|')}> [-h|--help]`)
}

const commands = { changes, verify, 'autofill-links': autofillLinks, 'add-new-blocks': addNewBlocks }

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
	const newBuildsTextFPath = `${textsDir}/builds_new.md`
	const refBuildsTextFPath = `${textsDir}/builds_old.md`

	info('loading builds...')
	const newBuilds = await loadBuilds()
	const refBuilds = await loadTranslationReferenceBuilds()

	newBuilds.characters.sort((a, b) => a.code.localeCompare(b.code))
	refBuilds.characters.sort((a, b) => a.code.localeCompare(b.code))

	info('saving texts...')
	await fs.writeFile(newBuildsTextFPath, textBlocksToMarkdown([...getBuildsFormattedBlocks(newBuilds)]))
	await fs.writeFile(refBuildsTextFPath, textBlocksToMarkdown([...getBuildsFormattedBlocks(refBuilds)]))

	info('done.')
	info('')
	info('now:')
	info('1) GET DIFF BETWEEN')
	info('  ' + relativeToCwd(refBuildsTextFPath))
	info('  ' + relativeToCwd(newBuildsTextFPath))
	info('')
	info('  for VSCode:')
	info(`    code --diff ${relativeToCwd(refBuildsTextFPath)} ${relativeToCwd(newBuildsTextFPath)}`)
	info('')
	info('2) APPLY CHANGES TO')
	for (const lang of langs) info('  ' + relativeToCwd(TRANSLATED_BUILDS_LANG_FPATH(lang)))
	info('')
	info('  for VSCode:')
	info('    code ' + langs.map(lang => relativeToCwd(TRANSLATED_BUILDS_LANG_FPATH(lang))).join(' '))
	info('    split window with Ctrl+\\')
	info('')
	info('3) VERIFY THE RESULT')
	info(`  ${thisScript} verify --ref=generated`)
	info('')
	info('4) UPDATE BUILDS DATA FILE')
	info(`  copy ${relativeToCwd(`${GENERATED_DATA_DIR}/builds.yaml`)}`)
	info(`    to ${relativeToCwd(TRANSLATED_BUILDS_REF_FPATH)}`)
}

async function addNewBlocks() {
	if (needHelp) {
		console.log(`Usage:
  ${thisScript} add-new-blocks [-h|--help]`)
		process.exit(2)
	}

	info(`loading builds...`)
	const refBuilds = await loadTranslationReferenceBuilds()
	const lang2blocks = await loadTranslatedBuildsBlocks()

	refBuilds.characters.sort((a, b) => a.code.localeCompare(b.code))

	info(`adding...`)
	for (const [lang, blocks] of Object.entries(lang2blocks)) {
		/** @type {Map<string, typeof blocks[number]>} */
		const path2block = new Map()

		for (const [block, path] of getBuildsFormattedBlocks(refBuilds)) {
			if (block === null) continue
			if (path2block.has(path)) continue
			path2block.set(path, { block, path, replacedFrom: null, src: textNodesToMarkdown(block) })
		}

		for (const block of blocks) {
			path2block.set(block.path, block)
		}

		const content = textBlocksSrcToMarkdown([...path2block.values()])
		await fs.writeFile(TRANSLATED_BUILDS_LANG_FPATH(lang), content)
	}

	info(`done.`)
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
	for (const code of GI_ARTIFACT_GROUP_CODES) searchers.artifacts.add(code, { name: code, code })

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
				if (typeof node !== 'string') {
					const errMsg = (/**@type {string}*/ type, /**@type {string}*/ suffix) =>
						err(`${lang}: block '${path}': wrong ${type} code: ${suffix}`)
					if ('weapon' in node)
						if (!(node.code in weapons))
							errMsg('weapon', `[${node.weapon}](#weapon:${node.code})`)
					if ('artifact' in node)
						if (
							!(node.code in artifacts) &&
							!GI_ARTIFACT_GROUP_CODES.includes(/**@type {*}*/ (node.code))
						)
							errMsg('artifact', `[${node.artifact}](#artifact:${node.code})`)
					if ('item' in node)
						if (!(node.code in items)) errMsg('item', `[${node.item}](#item:${node.code})`)
				}
			}
		}
	}

	info('done, ' + (errored ? 'with errors' : 'seems OK.'))
	if (errored) process.exit(1)
}
