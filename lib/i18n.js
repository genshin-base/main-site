export const I18N_BUILD_SUMMARY_SHARING_CAPTION = /** @type {const} */ ({
	en: (/**@type {string}*/ url) => 'More builds and info: ' + url,
	ru: (/**@type {string}*/ url) => 'Больше билдов и информации: ' + url,
})

/**
 * @template T
 * @param {string} lang
 * @param {{en:T, [key:string]:T}} values
 * @returns {T}
 */
export function chooseLangVal(lang, values) {
	return values[lang] ?? values.en
}
