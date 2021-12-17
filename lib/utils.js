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
