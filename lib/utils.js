import path from 'path'
import { promises as fs } from 'fs'

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

/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string} msg
 */
export function info(msg) {
	console.log('\x1b[32mINFO\x1b[0m: ' + msg)
}
/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string} msg
 */
export function warn(msg) {
	console.warn('\x1b[33mWARN\x1b[0m: ' + msg)
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
