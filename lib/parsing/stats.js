import { GI_KNOWN_STAT_BONUS_CODES } from '#lib/genshin.js'
import { warn } from '#lib/utils/logs.js'

/** @param {string} text */
export function statTextToCode(text) {
	return text
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, '-')
		.replace(/-%/g, '%')
		.replace(/-damage(%)?$/, '-dmg$1')
		.replace('elemental-mastery', 'em')
		.replace('energy-recharge', 'er')
		.replace(/attack$/, 'atk')
		.replace(/^attack/, 'atk')
		.replace(/health(%)?$/, 'hp$1')
		.replace(/defense(%)?$/, 'def$1')
		.replace(/^critical/, 'crit')
		.replace(/^flat-/, '')
		.replace(/^base-/, '')
		.replace(/^physical-/, 'phys-')
		.replace(/-bonus(%)?$/, '$1')
}

/**
 * @param {string} text
 * @param {string} warnSuffix
 * @returns {string}
 */
export function statTextToCodeChecked(text, warnSuffix) {
	const code = statTextToCode(text)
	if (!GI_KNOWN_STAT_BONUS_CODES.includes(/**@type {*}*/ (code)))
		warn(`unexpected stat '${text}' (${code}) ${warnSuffix}`)
	return code
}
