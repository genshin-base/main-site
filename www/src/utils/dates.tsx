export function msToHmWords(duration: number): string {
	const minutes = Math.floor((duration / (1000 * 60)) % 60),
		hours = Math.floor((duration / (1000 * 60 * 60)) % 24)

	return hours + 'h ' + minutes + 'm'
}
