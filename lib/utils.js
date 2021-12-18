import path from 'path'

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

/** @param {string} msg */
export function warn(msg) {
	console.warn('\x1b[33mWARN\x1b[0m: ' + msg)
}
