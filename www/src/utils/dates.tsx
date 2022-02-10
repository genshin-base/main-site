export function msToHmWords(duration: number): string {
	const minutes = Math.floor((duration / (1000 * 60)) % 60),
		hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

	return hours + ' hours ' + minutes + ' minutes' //todo l10n //todo plural
}
