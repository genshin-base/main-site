import {
	I18N_HOUR,
	I18N_HOURS,
	I18N_HOURS_3,
	I18N_MINUTE,
	I18N_MINUTES,
	I18N_MINUTES_3,
} from '#src/i18n/i18n'
import { pluralizeEN, pluralizeRU } from './strings'

export function msToHmWords(duration: number): string {
	const minutes = Math.floor((duration / (1000 * 60)) % 60),
		hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
	const pluralizeFunc = BUNDLE_ENV.LANG === 'en' ? pluralizeEN : pluralizeRU
	return `${hours} ${pluralizeFunc(hours, I18N_HOUR, I18N_HOURS, I18N_HOURS_3)} ${minutes} ${pluralizeFunc(
		minutes,
		I18N_MINUTE,
		I18N_MINUTES,
		I18N_MINUTES_3,
	)}`
}
