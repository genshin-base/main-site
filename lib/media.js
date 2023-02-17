import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import { tmpdir } from 'os'
import { dirname } from 'path'
import { warn } from './utils/logs.js'
import { relativeToCwd, runAndReadStdout } from './utils/os.js'

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {Promise<void>}
 */
export function runCmd(cmd, args) {
	return new Promise((resolve, reject) => {
		const process = spawn(cmd, args, { stdio: 'inherit' })
		process.on('close', code =>
			code === 0 ? resolve() : reject(new Error(`'${cmd} ${args.join(' ')}' exited with code ${code}`)),
		)
	})
}

/**
 * {@link https://imagemagick.org/script/command-line-options.php}
 * @param {string} inFPath
 * @param {string} outFPath
 * @param {string[]} args
 * @param {string} [format]
 */
export async function magick(inFPath, outFPath, args, format) {
	return runCmd('magick', [inFPath, ...args, (format ? format + ':' : '') + outFPath])
}

/** @param {string} inFPath */
export async function getImgSize(inFPath) {
	const line = await runAndReadStdout('magick', ['identify', '-ping', '-format', '%w %h', inFPath])
	const m = line.match(/(\d+) (\d+)/)
	if (!m) throw new Error("unexpected 'magick identify' output: " + line)
	return { width: parseInt(m[1]), height: parseInt(m[2]) }
}

/**
 * @param {string} inFPath
 * @param {string} outFPath
 * @param {string} size
 *  * `width`           Width given, height automagically selected to preserve aspect ratio.
 *  * `xheight`         Height given, width automagically selected to preserve aspect ratio.
 *  * `widthxheight`    Maximum values of height and width given, aspect ratio preserved.
 *  * `widthxheight^`   Minimum values of width and height given, aspect ratio preserved.
 *  * `widthxheight!`   Width and height emphatically given, original aspect ratio ignored.
 *  * `widthxheight>`   Shrinks an image with dimension(s) larger than the corresponding width and/or height argument(s).
 *  * `widthxheight<`   Enlarges an image with dimension(s) smaller than the corresponding width and/or height argument(s).
 *
 * More: {@link https://imagemagick.org/script/command-line-processing.php}
 */
export function resize(inFPath, outFPath, size) {
	// Catrom выдаёт более резкий результат
	return magick(inFPath, outFPath, ['-filter', 'Catrom', '-resize', size])
}

/**
 * @param {number} width
 * @param {number} height
 * @returns {(inFPath:string, outFPath:string) => Promise<void>}
 */
export function makeResizeFitChecked(width, height) {
	return async (inFPath, outFPath) => {
		const { width: srcW, height: srcH } = await getImgSize(inFPath)
		if (Math.max(srcW / width, srcH / height) < 1.5)
			warn(`src image ${relativeToCwd(inFPath)} ${srcW}x${srcH} is too small for ${width}x${height}`)
		return resize(inFPath, outFPath, `${width}x${height}`)
	}
}

/**
 * @param {string} inFPath
 * @param {string} outFPath
 * @param {number} [speed]
 */
export async function pngquant(inFPath, outFPath, speed = 1) {
	return runCmd('pngquant', ['--force', '--strip', '--speed=' + speed, '--output', outFPath, inFPath])
}

/**
 * @param {string} inFPath
 * @param {string} outFPath
 * @param {number} [level]
 */
export async function optipng(inFPath, outFPath, level = 3) {
	// если outFPath существует, optipng создаёт рядом .bak-файл независимо от флагов, рукалицо
	await fs.rm(outFPath, { force: true })
	return runCmd('optipng', ['-clobber', '-quiet', '-strip=all', '-o' + level, inFPath, '-out', outFPath])
}

/** @typedef {(inFPath:string, outFPath:string) => Promise<unknown>} MediaChainItem */
/**
 * @param {string} inFPath
 * @param {string} outFPath
 * @param  {...MediaChainItem} chain
 */
export async function mediaChain(inFPath, outFPath, ...chain) {
	if (chain.length === 0) return
	if (chain.length === 1) {
		await chain[0](inFPath, outFPath)
		return
	}
	const tmpDir = await fs.mkdtemp(`${tmpdir()}/gbase_`)
	try {
		let srcFPath = inFPath
		for (let i = 0; i < chain.length; i++) {
			const isLast = i === chain.length - 1
			const destFPath = isLast ? outFPath : `${tmpDir}/${i % 2}`

			if (isLast) await fs.mkdir(dirname(destFPath), { recursive: true })
			await chain[i](srcFPath, destFPath)

			srcFPath = destFPath
		}
	} finally {
		await fs.rm(tmpDir, { recursive: true, force: true })
	}
}
