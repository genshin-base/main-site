/**
 * Конвертирует номер дня недели из вс-пн…-сб в пн-вт…-вс
 * @param {number} weekday
 * @returns {number}
 */
export function weekdayAsMonSun(weekday) {
	return weekday === 0 ? 6 : weekday - 1
}

/**
 * @param {Date|number} date
 * @returns {Date}
 */
export function dayStartUTC(date) {
	date = new Date(date)
	date.setUTCHours(0, 0, 0, 0)
	return date
}
