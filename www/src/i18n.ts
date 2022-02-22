type Lang = 'en' | 'ru'

const LANG = BUNDLE_ENV.LANG as Lang

/** Все языки, без выбора текущего */
export const $LANG_NAMES: Record<Lang, string> = {
	en: 'English',
	ru: 'Русский',
}

export const $LANG_NAME = $LANG_NAMES[LANG]
