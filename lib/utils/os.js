import path from 'path'
import { promises as fs } from 'fs'

/** @param {string} fpath */
export function relativeToCwd(fpath) {
	return path.relative(process.cwd(), fpath)
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
