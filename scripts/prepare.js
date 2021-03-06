#!/usr/bin/env node
import { promises as fs } from 'fs'
import { magick, mediaChain, optipng, pngquant, resize, runCmd } from '#lib/media.js'
import { fatal, info, warn } from '#lib/utils/logs.js'
import { parseArgs, relativeToCwd } from '#lib/utils/os.js'
import { BASE_DIR, loadCharacters, WWW_MEDIA_DIR } from './_common.js'

const args = parseArgs()
const needHelp = args['--help'] || args['-h']
const thisScript = `node ${relativeToCwd(process.argv[1])}`

function printUsage() {
	console.log(`Usage:
  ${thisScript} <${Object.keys(commands).join('|')}> [-h|--help]`)
}

const commands = {
	async avatar() {
		const { code, src } = needItemImageArgs('character')
		checkCharacterCode(code)
		await fs.mkdir(`${WWW_MEDIA_DIR}/characters/avatars`, { recursive: true })
		const dest = `${WWW_MEDIA_DIR}/characters/avatars/${code}.png`
		const destLarge = `${WWW_MEDIA_DIR}/characters/avatars/${code}.large.png`

		// prettier-ignore
		const makeCircleResize = (size) => (i, o) => magick(i, o, [
			'\(', '+clone', '-alpha', 'transparent', '-fill', 'white', '-draw', 'circle %[fx:w/2],%[fx:h/2] %[fx:w],%[fx:h/2]', '\)',
			'-define', 'compose:sync=false', '-compose', 'multiply', '-composite',
			'-filter', 'Catrom', '-resize', size
		])
		const circleResizeNormal = makeCircleResize('72x72')
		const circleResizeLarge = makeCircleResize('120x120')

		await mediaChain(src, dest, circleResizeNormal, pngquant, optipng)
		info(`saved to ${relativeToCwd(dest)}`)
		await mediaChain(src, destLarge, circleResizeLarge, pngquant, optipng)
		info(`saved to ${relativeToCwd(destLarge)}`)
	},
	async portrait() {
		const { code, src } = needItemImageArgs('character')
		checkCharacterCode(code)

		await fs.mkdir(`${WWW_MEDIA_DIR}/characters/portraits`, { recursive: true })
		const destPng = `${WWW_MEDIA_DIR}/characters/portraits/${code}.png`
		const destSvg = `${WWW_MEDIA_DIR}/characters/silhouettes/${code}.svg`

		await mediaChain(src, destPng, (i, o) => resize(i, o, '450'), pngquant, optipng)
		info(`saved to ${relativeToCwd(destPng)}`)

		const args = ['-resize', '512x512', '-channel', 'A', '-separate', '-brightness-contrast', '25x35']
		const resizeAndAlpha = (i, o) => magick(i, o, args, 'bmp')
		await mediaChain(src, destSvg, resizeAndAlpha, potrace, svgo)
		info(`saved to ${relativeToCwd(destSvg)}`)
	},
}

;(async () => {
	if (args['cmd'] in commands) {
		await commands[args['cmd']]()
	} else {
		printUsage()
		process.exit(needHelp ? 2 : 1)
	}
})().catch(fatal)

/** @param {string} itemType */
function needItemImageArgs(itemType) {
	function printCmdUsage() {
		console.log(`Usage:
  ${thisScript} ${args['cmd']} [-h|--help] --code ${itemType}-code --src path/to/source/image`)
	}
	const code = args['--code']
	const src = args['--src']
	if (!code || !src || needHelp) {
		printCmdUsage()
		process.exit(needHelp ? 2 : 1)
	}
	return { code, src }
}

/** @param {string} code */
async function checkCharacterCode(code) {
	if (code === 'traveler') return
	const names = await loadCharacters()
	if (!(code in names)) warn(`character '${code}' is unknown`)
}

/**
 * @param {string} inFPath
 * @param {string} outFPath
 */
async function potrace(inFPath, outFPath) {
	await runCmd('potrace', [
		'--backend=svg',
		'--invert',
		'--unit=10',
		'--opttolerance=0.2',
		'--output',
		outFPath,
		inFPath,
	])
}

/**
 * @param {string} inFPath
 * @param {string} outFPath
 */
async function svgo(inFPath, outFPath) {
	return runCmd(`${BASE_DIR}/node_modules/.bin/svgo`, [
		inFPath,
		'-o',
		outFPath,
		'--multipass',
		'--precision=0',
		'--quiet',
	])
}
