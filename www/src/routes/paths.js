import { charactersShortList } from '../api/generated.js'

export const paths = /** @type {const} */ ({
	front: [''],
	builds: ['/builds', ['code', []]],
	buildCharacters: ['/builds/', ['code', charactersShortList.map(x => x.code)]],
	equipment: ['/equipment'],
})

/**
 * @param {import('./router').RoutePath} path
 * @param {string} url
 * @returns {Record<string, string> | null}
 */
export function matchPath(path, url) {
	let rem = url
	const props = /**@type {Record<string, string>}*/ ({})
	for (const part of path) {
		let matched = true //на случай пустых variants
		if (typeof part === 'string') {
			;[rem, matched] = withoutPrefix(rem, part)
		} else {
			const [name, variants] = part
			for (const variant of variants) {
				;[rem, matched] = withoutPrefix(rem, variant)
				if (matched) {
					props[name] = variant
					break
				}
			}
		}
		if (!matched) return null
	}
	return !rem || rem === '/' ? props : null
}

/**
 * @param {string} url
 * @param {string} prefix
 * @returns {[string, boolean]}
 */
function withoutPrefix(url, prefix) {
	return url.startsWith(prefix) ? [url.slice(prefix.length), true] : [url, false]
}
