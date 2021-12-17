/**
 * @class
 * @template T
 */
export function TrigramSearcher() {
	/** @type {[Set<string>, T][]} */
	const items = []

	/**
	 * @param {string} key
	 * @param {T} value
	 */
	this.add = (key, value) => {
		items.push([getTrigrams(key), value])
	}

	/**
	 * @param {string} key
	 * @param {number} n
	 * @returns {{sim:number, val:T}[]}
	 */
	this.getN = (key, n) => {
		const keyTris = getTrigrams(key)
		const best = /**@type {{sim:number, val:T}[]} */ ([])
		for (let i = 0; i < items.length; i++) {
			const [tris, val] = items[i]
			const sim = getSimularity(keyTris, tris)
			if (best.length < n || sim > best[best.length - 1].sim) {
				let item = best.length === n && best.pop()
				if (item) {
					item.sim = sim
					item.val = val
				} else {
					item = { sim, val }
				}
				insertSorted(best, item)
			}
		}
		return best
	}
}

/**
 * @param {string[]} arr
 * @returns {TrigramSearcher<string>}
 */
export function trigramSearcherFromStrings(arr) {
	const s = new TrigramSearcher()
	for (let i = 0; i < arr.length; i++) s.add(arr[i], arr[i])
	return s
}

/**
 * @template T
 * @param {{sim:number, val:T}[]} arr
 * @param {{sim:number, val:T}} item
 */
function insertSorted(arr, item) {
	for (let i = 0; i < arr.length; i++) {
		if (item.sim > arr[i].sim) {
			arr.splice(i, 0, item)
			return
		}
	}
	arr.push(item)
}

/** @param {string} text */
function getTrigrams(text) {
	const res = /** @type {Set<string>}*/ (new Set())
	let prev1 = ' '
	let prev0 = ' '
	for (const c of text) {
		res.add(prev1 + prev0 + c)
		prev1 = prev0
		prev0 = c
	}
	res.add(prev1 + prev0 + ' ')
	return res
}

/**
 * @param {Set<string>} a
 * @param {Set<string>} b
 */
function getSimularity(a, b) {
	let matches = 0
	for (const tri of a) if (b.has(tri)) matches++
	return matches / a.size
}
