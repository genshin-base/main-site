import path from 'path'
import { promises as fs } from 'fs'

/**
 * @template T
 * @param {T|null} val
 * @returns {T}
 */
export function mustBeNotNull(val) {
	if (val === null) throw new Error('value is null, this should not happen')
	return val
}

/**
 * @template T
 * @param {T|undefined} val
 * @returns {T}
 */
export function mustBeDefined(val) {
	if (val === undefined) throw new Error('value is undefined, this should not happen')
	return val
}

/** @param {string} fpath */
export function relativeToCwd(fpath) {
	return path.relative(process.cwd(), fpath)
}

let needStdoutNewline = false
/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string} msg
 * @param {{newline?:boolean}} [opts]
 */
export function info(msg, opts) {
	if (needStdoutNewline) console.log()
	const newline = opts?.newline !== false
	process.stdout.write('\x1b[32mINFO\x1b[0m: ' + msg + (newline ? '\n' : ''))
	needStdoutNewline = !newline
}
/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string} msg
 */
export function warn(msg) {
	if (needStdoutNewline) console.log()
	console.warn('\x1b[33mWARN\x1b[0m: ' + msg)
	needStdoutNewline = false
}
export function progress() {
	process.stdout.write('.')
	needStdoutNewline = true
}

const SIZE_SUFFIXES = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']

export function sizeToString(n) {
	for (let i = 0; i < SIZE_SUFFIXES.length; i++) {
		if (n < 1 << (10 * (i + 1)) || i === SIZE_SUFFIXES.length - 1) {
			const nf = n / 1024 ** i
			if (nf >= 1000 && i < SIZE_SUFFIXES.length - 1) {
				return '1.0 ' + SIZE_SUFFIXES[i + 1]
			} else {
				return nf.toFixed(1) + ' ' + SIZE_SUFFIXES[i]
			}
		}
	}
	return n + ' ?'
}

/** @param {string} fpath */
export function exists(fpath) {
	return fs
		.stat(fpath)
		.then(() => true)
		.catch(err => {
			if (err.code === 'ENOENT') return false
			throw err
		})
}

/** @returns {Record<string, string>} */
export function parseArgs() {
	return process.argv
		.slice(2)
		.flatMap(x => x.split(/(?<=^--?[\w-]+)=/))
		.reduce(
			({ args, key }, cur) =>
				cur.startsWith('-')
					? ((args[cur] = 'true'), { args, key: cur })
					: ((args[key] = cur), { args, key: 'cmd' }),
			{ args: /**@type {Record<string, string>}*/ ({}), key: 'cmd' },
		).args
}
