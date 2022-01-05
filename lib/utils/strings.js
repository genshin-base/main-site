const SIZE_SUFFIXES = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']

export function sizeToString(n) {
	for (let i = 0; i < SIZE_SUFFIXES.length; i++) {
		if (n < 1 << (10 * (i + 1)) || i === SIZE_SUFFIXES.length - 1) {
			const nf = n / 1024 ** i
			if (nf >= 1000 && i < SIZE_SUFFIXES.length - 1) {
				return '1.0 ' + SIZE_SUFFIXES[i + 1]
			} else {
				return nf.toFixed(1) + ' ' + SIZE_SUFFIXES[i]
			}
		}
	}
	return n + ' ?'
}
