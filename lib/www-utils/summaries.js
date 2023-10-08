import { trimSlashEnd } from '#lib/utils/strings.js'

/**
 * @param {string} mediaDir
 * @param {string} characterCode
 * @param {string} roleCode
 * @param {string} lang
 * @param {string} ext
 */
export function getBuildSummaryPath(mediaDir, characterCode, roleCode, lang, ext) {
	roleCode = roleCode.replace(/[\s/\[\]]/g, '-') //TODO: better role code
	return `${trimSlashEnd(mediaDir)}/summaries/builds/${characterCode}/${roleCode}-${lang}.${ext}`
}