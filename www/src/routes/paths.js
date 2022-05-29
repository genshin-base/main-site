import { charactersShortList } from '../api/generated.js'

export const paths = /** @type {const} */ ({
	front: [''],
	builds: ['/builds'],
	buildCharacters: ['/builds/', ['code', charactersShortList.map(x => x.code)]],
	weapons: ['/weapons'],
	artifacts: ['/artifacts'],
	about: ['/about'],
})

/**
 * @param {import('./router').RoutePath} path
 * @param {string} url
 * @returns {Record<string, string> | null}
 */
export function matchPath(path, url) {
	if (path.length === 0) return null
	let rem = url
	const props = /**@type {Record<string, string>}*/ ({})
	for (const part of path) {
		let matched = true //true на случай пустых variants
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
 * @param {string} prefix
 * @param {import('./router').RoutePath} path
 * @param {number} [fromIndex]
 * @returns {string[]}
 */
export function pathToStrings(prefix, path, fromIndex = 0) {
	if (path.length === 0) return []
	if (fromIndex >= path.length) return [prefix]

	const part = path[fromIndex]
	if (typeof part === 'string') {
		return pathToStrings(prefix + part, path, fromIndex + 1)
	} else {
		const [, variants] = part
		return variants.flatMap(x => pathToStrings(prefix + x, path, fromIndex + 1))
	}
}

/**
 * @param {string} url
 * @param {string} prefix
 * @returns {[string, boolean]}
 */
function withoutPrefix(url, prefix) {
	return url.startsWith(prefix) ? [url.slice(prefix.length), true] : [url, false]
}
