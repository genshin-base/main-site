export function pluralizeEN(n: number, w0: string, w1: string): string {
	if (n < 0) n = -n
	const d0 = n % 10
	const d10 = n % 100

	if (d10 === 11 || d10 === 12 || d0 === 0 || (d0 >= 2 && d0 <= 9)) return w1
	return w0
}
export function pluralizeRU(n: number, w0: string, w1: string, w3: string): string {
	if (n < 0) n = -n
	if (n % 10 === 1 && n % 100 !== 11) {
		return w0
	} else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
		return w1
	} else {
		return w3
	}
	return w0
}
