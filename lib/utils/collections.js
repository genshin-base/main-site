/**
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function arrSimpleUniq(arr) {
	for (let i = arr.length - 1; i >= 0; i--) {
		const index = arr.indexOf(arr[i], i + 1)
		if (index < i) arr.splice(i, 1)
	}
	return arr
}

/**
 * @template T
 * @param {T[]} arr
 * @param {T} item
 * @returns {number}
 */
export function arrPushIfNew(arr, item) {
	return arr.includes(item) ? arr.length : arr.push(item)
}

/**
 * @template T
 * @param {T[]} arr
 * @param {(item:T) => boolean} func
 * @returns {T[][]}
 */
export function arrSplitFn(arr, func) {
	const res = /**@type {T[][]}*/ ([[]])
	for (let i = 0; i < arr.length; i++) {
		const item = arr[i]
		if (func(item)) res.push([])
		else res[res.length - 1].push(item)
	}
	return res
}

/**
 * @template TVal
 * @param {Record<string, TVal>} obj
 * @param {(a:[string,TVal], b:[string,TVal]) => number} sortFunc
 * @returns
 */
export function sortObject(obj, sortFunc) {
	const entries = Object.entries(obj).sort(sortFunc)
	for (const key in obj) delete obj[key]
	for (const [key, val] of entries) obj[key] = val
	return obj
}
