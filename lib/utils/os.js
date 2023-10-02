import path from 'path'
import yaml from 'yaml'
import { promises as fs } from 'fs'
import { spawn } from 'child_process'

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

export function ignoreNotExists(err) {
	if (err.code !== 'ENOENT') throw err
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

/**
 * @template T
 * @param {string} fpath
 * @param {T} defaultVal
 * @param {(data:T) => Promise<T>} func
 */
export async function processCachedYaml(fpath, defaultVal, func) {
	let val = defaultVal
	try {
		val = yaml.parse(await fs.readFile(fpath, { encoding: 'utf-8' }))
	} catch (ex) {
		if (ex.code !== 'ENOENT') throw ex
	}
	const newVal = await func(val)
	await fs.writeFile(fpath, yaml.stringify(newVal))
	return newVal
}

/**
 * @param {string} cmd
 * @param {string[]} args
 * @returns {Promise<string>}
 */
export function runAndReadStdout(cmd, args) {
	return new Promise((resolve, reject) => {
		const process = spawn(cmd, args, { stdio: ['inherit', 'pipe', 'inherit'] })
		let output = ''
		process.on('close', code =>
			code === 0
				? resolve(output)
				: reject(new Error(`'${cmd} ${args.join(' ')}' exited with code ${code}`)),
		)
		process.stdout.on('data', msg => (output += msg))
	})
}
