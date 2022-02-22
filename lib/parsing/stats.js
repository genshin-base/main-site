import { GI_KNOWN_STAT_BONUS_CODES } from '#lib/genshin.js'
import { warn } from '#lib/utils/logs.js'

/** @param {string} text */
export function statTextToCode(text) {
	return text
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, '-')
		.replace(/-%/g, '%')
		.replace(/-damage$/, '-dmg')
		.replace('elemental-mastery', 'em')
		.replace('energy-recharge', 'er')
		.replace(/^flat-/, '')
		.replace(/^base-/, '')
		.replace(/^physical-/, 'phys-')
		.replace(/-bonus(%)?$/, '$1')
}

/**
 * @param {string} text
 * @param {string} warnSuffix
 */
export function statTextToCodeChecked(text, warnSuffix) {
	const code = statTextToCode(text)
	if (!GI_KNOWN_STAT_BONUS_CODES.includes(/**@type {*}*/ (code)))
		warn(`unexpected stat '${text}' (${code}) ${warnSuffix}`)
	return code
}
