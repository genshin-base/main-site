export const I18N_BUILD_SUMMARY_SHARING_CAPTION = /** @type {const} */ ({
	en: (/**@type {string}*/ url) => 'More builds and info: ' + url,
	ru: (/**@type {string}*/ url) => 'Больше билдов и информации: ' + url,
})

/**
 * @param {string|null|undefined} langRaw
 * @param {string[]} langs
 */
export function chooseLang(langRaw, langs) {
	if (langRaw && langs.includes(langRaw)) return langRaw
	if (langRaw === 'ua' && langs.includes('ru')) return 'ru'
	return 'en'
}

/**
 * @template T
 * @param {string|null|undefined} langRaw
 * @param {{en:T, [key:string]:T}} values
 * @returns {T}
 */
export function chooseLangVal(langRaw, values) {
	if (langRaw && langRaw in values) return values[langRaw]
	if (langRaw === 'ua' && 'ru' in values) values.ru
	return values.en
}
