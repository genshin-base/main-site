import { createWriteStream, promises as fs } from 'fs'
import { request as httpsRequest } from 'https'
import { debuglog } from 'util'
import { relativeToCwd } from '#lib/utils/os.js'
import { sizeToString } from '#lib/utils/strings.js'

const debug = debuglog('gbase-debug')

/**
 * @param {import('http').IncomingMessage} source
 * @returns {Promise<string>}
 */
function loadChunkedStr(source) {
	return new Promise((resolve, reject) => {
		const chunks = []
		source.on('data', chunk => {
			chunks.push(chunk)
		})
		source.on('end', () => {
			try {
				resolve(Buffer.concat(chunks).toString('utf-8'))
			} catch (ex) {
				reject(ex)
			}
		})
		source.on('error', reject)
	})
}

/**
 * @param {import('http').IncomingMessage} source
 * @returns {Promise<any>}
 */
function loadChunkedJSON(source) {
	return loadChunkedStr(source).then(data => JSON.parse(data))
}

/**
 * @param {string} url
 * @param {Record<string,string>|null} data
 * @returns {Promise<{response:import('http').IncomingMessage, data:any}>}
 */
export function getJSON(url, data) {
	const headers = /**@type {import('http').OutgoingHttpHeaders}*/ ({})
	if (data && 'access_token' in data) {
		headers['Authorization'] = 'Bearer ' + data.access_token
		delete data.access_token
	}
	if (data) {
		const items = Object.entries(data).map(([k, v]) => k + '=' + encodeURIComponent(v))
		if (items.length > 0) url += '?' + items.join('&')
	}
	return new Promise((resolve, reject) => {
		const req = httpsRequest(url, { method: 'GET', headers }, response => {
			loadChunkedStr(response).then(data => resolve({ response, data }), reject)
		})
		req.on('error', reject)
		req.end()
	})
}

/**
 * @param {string} url
 * @param {Record<string,string>|null} data
 * @param {string} fpath
 * @param {boolean} [canRedirect]
 * @returns {Promise<{response:import('http').IncomingMessage}>}
 */
export function getFile(url, data, fpath, canRedirect) {
	if (data) {
		const items = Object.entries(data).map(([k, v]) => k + '=' + encodeURIComponent(v))
		if (items.length > 0) url += '?' + items.join('&')
	}

	let writeStream = /**@type {import('fs').WriteStream|null}*/ (null)
	return new Promise((resolve, reject) => {
		const req = httpsRequest(url, { method: 'GET' }, response => {
			if (canRedirect && response.statusCode && ((response.statusCode / 100) | 0) === 3) {
				const location = response.headers.location
				if (!location) {
					reject(new Error(`got ${response.statusCode} without location`))
					return
				}
				debug('FILE: redirecting to: ' + location)
				getFile(location, null, fpath, false).then(resolve).catch(reject)
				return
			}

			if (response.statusCode !== 200) {
				reject(new Error(`unexpected status ${response.statusCode} in response to ${url}`))
				return
			}

			const ws = createWriteStream(fpath)
			writeStream = ws
			response.pipe(ws)
			ws.on('finish', () => {
				ws.close(err => (err ? reject(err) : resolve({ response })))
			})

			const size = parseInt(response.headers['content-length'] ?? '', 10)
			let total = 0
			let prevTime = 0
			response.on('data', chunk => {
				total += chunk.length
				const now = performance.now()
				if (now - prevTime > 1000) {
					const percent = isNaN(size) ? '' : `${((total * 100) / size) | 0}%`
					debug(`FILE: ${sizeToString(total)} ${percent}`)
					prevTime = now
				}
			})
			response.on('end', () => {
				debug(`FILE: ${sizeToString(total)}, done`)
			})
		})
		req.on('error', reject)
		req.end()
	}).finally(() => writeStream && writeStream.close())
}

/**
 * @param {string} url
 * @param {Record<string,string>|null} data
 * @param {string} fpath
 * @param {boolean} canRedirect
 * @param {number} cacheDurationMS
 * @returns {Promise<boolean>}
 */
export async function getFileCached(url, data, fpath, canRedirect, cacheDurationMS) {
	const stat = await fs.stat(fpath).catch(err => {
		if (err.code === 'ENOENT') return null
		throw err
	})

	const isOld = stat && Date.now() - stat.mtime.getTime() > cacheDurationMS
	if (!stat || isOld) {
		debug(`FILE: ${relativeToCwd(fpath)} is ${isOld ? 'old' : 'missing'}, downloading`)
		const tmpFname = fpath + '.tmp'
		await getFile(url, data, tmpFname, canRedirect)
		await fs.rename(tmpFname, fpath)
		return false
	}
	return true
}

/**
 * @param {string} url
 * @param {unknown} data
 * @returns {Promise<{response:import('http').IncomingMessage, data:any}>}
 */
export function postJSON(url, data) {
	return new Promise((resolve, reject) => {
		const req = httpsRequest(
			url,
			{ method: 'POST', headers: { 'content-type': 'application/json' } },
			response => {
				loadChunkedJSON(response).then(data => resolve({ response, data }), reject)
			},
		)
		req.on('error', reject)
		req.write(JSON.stringify(data))
		req.end()
	})
}
