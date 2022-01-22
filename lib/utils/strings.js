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

/**
 * @param {string} str
 * @param {RegExp} re
 */
export function trimEndRe(str, re) {
	const m = str.match(re)
	return m ? str.slice(0, -m[0].length) : str
}

/**
 * @param {string} text
 * @returns {string}
 */
export function capitaliseFirst(text) {
	if (text === '') return ''
	return text[0].toLocaleUpperCase() + text.slice(1)
}

/**
 * @param {string[]} names
 * @param {number} [minWordLen]
 */
export function findMostCommonWords(names, minWordLen = 2) {
	const wordUsageMap = /**@type {Map<String,Set<string>>}*/ (new Map())
	const split = (/**@type {string}*/ text) => text.split(/[\s:]+/)

	for (const name of names) {
		for (let word of split(name))
			if (word.length >= minWordLen) {
				word = word.toLocaleLowerCase()
				wordUsageMap.set(word, (wordUsageMap.get(word) ?? new Set()).add(name))
			}
	}

	const wordUsages = Array.from(wordUsageMap.entries()).sort(
		(a, b) => b[1].size - a[1].size || b[0].length - a[0].length,
	)

	// Common name from common words. Example:
	//   names:                                    "A x B", "A y B", "A C"
	//   top usages:                               "A" "B" (both 2 times)
	//   names with common words:                  "A x B", "A y B"
	//   first common name with only common words: "A B" (result)
	let commonNames = Array.from(wordUsages[0][1])
	const usedWords = [wordUsages[0][0]]
	const maxCount = commonNames.length
	for (let i = 1; i < wordUsages.length; i++) {
		const [word, relatedNames] = wordUsages[i]
		if (relatedNames.size !== maxCount) break
		const newNames = commonNames.filter(x => relatedNames.has(x))
		if (newNames.length === 0) break
		usedWords.push(word)
		commonNames = newNames
	}
	return split(commonNames[0])
		.filter(x => usedWords.includes(x.toLocaleLowerCase()))
		.join(' ')
}
