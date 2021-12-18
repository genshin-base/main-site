import { warn } from '#lib/utils.js'

const KNOWN_STAT_CODES = new Set(
	'def def% dmg dmg% atk atk% hp hp% em er er% healing-bonus healing-bonus%'.split(' '),
)
const KNOWN_STAT_CRIT_SUFFIXES = new Set('rate dmg rate% dmg%'.split(' '))
const KNOWN_STAT_DMG_PEFIXES = new Set('phys cryo geo anemo hydro electro pyro'.split(' '))

/** @param {string} text */
export function statTextToCode(text) {
	return text
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, '-')
		.replace(/-%/g, '%')
		.replace(/-damage$/, '-dmg')
		.replace('elemental-mastery', 'em')
		.replace('energy-recharge', 'em')
		.replace(/^flat-/, '')
		.replace(/^base-/, '')
		.replace(/^physical-/, 'phys-')
}

/**
 * @param {string} text
 * @param {string} warnSuffix
 */
export function statTextToCodeChecked(text, warnSuffix) {
	const code = statTextToCode(text)
	if (
		!KNOWN_STAT_CODES.has(code) &&
		!(code.startsWith('crit-') && KNOWN_STAT_CRIT_SUFFIXES.has(code.slice(5))) &&
		!(code.endsWith('-dmg') && KNOWN_STAT_DMG_PEFIXES.has(code.slice(0, -4))) &&
		!(code.endsWith('-dmg%') && KNOWN_STAT_DMG_PEFIXES.has(code.slice(0, -5)))
	)
		warn(`unexpected stat '${text}' (${code}) ${warnSuffix}`)
	return code
}
