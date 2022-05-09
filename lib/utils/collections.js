/**
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
export function arrSimpleUniq(arr) {
	return arr.filter((value, index, self) => self.indexOf(value) === index)
}

/**
 * @template T
 * @param {T[]} arr
 * @param {T[]} items
 * @returns {number}
 */
export function arrPushIfNew(arr, ...items) {
	for (let i = 0; i < items.length; i++)
		if (!arr.includes(items[i])) {
			arr.push(items[i])
		}
	return arr.length
}
/**
 * @template T
 * @param {T[]} arr
 * @param {T} item
 * @returns {T[]}
 */
export function toggleInArr(arr, item) {
	if (arr.includes(item)) arr = arr.filter(i => i !== item)
	else arr.push(item)
	return arr
}

/**
 * @template TKey
 * @template TVal
 * @param {Map<TKey, TVal[]>} map
 * @param {TKey} key
 * @param {TVal} val
 * @returns {TVal[]}
 */
export function mappedArrPush(map, key, val) {
	let values = map.get(key)
	if (values) {
		values.push(val)
	} else {
		values = [val]
		map.set(key, values)
	}
	return values
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
 * @param {unknown[]} a
 * @param {unknown[]} b
 */
export function arrShallowEqualAsSets(a, b) {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) if (!b.includes(a[i])) return false
	return true
}

/**
 * @param {unknown[]} a
 * @param {unknown[]} b
 */
export function arrShallowEqual(a, b) {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
	return true
}

/**
 * @template {string} TKey
 * @template TVal
 * @param {Record<TKey, TVal>} obj
 * @param {(a:[TKey,TVal], b:[TKey,TVal]) => number} sortFunc
 * @returns {Record<TKey, TVal>}
 */
export function sortObject(obj, sortFunc) {
	const entries = /**@type {[TKey,TVal][]}*/ (Object.entries(obj)).sort(sortFunc)
	for (const key in obj) delete obj[key]
	for (const [key, val] of entries) obj[key] = val
	return obj
}
/**
 * @template T
 * @param {T[]} arr
 * @param {T} item
 * @param {1|-1} [direction]
 * @returns {T}
 */
export function arrGetAfter(arr, item, direction = 1) {
	const index = arr.indexOf(item)
	return arr[(index + direction + arr.length) % arr.length]
}

/**
 * @template TKey
 * @template TVal
 * @param {Map<TKey, TVal>} map
 * @param {TKey} key
 * @param {() => TVal} defaultFunc
 * @returns {TVal}
 */
export function mapGetOrSet(map, key, defaultFunc) {
	let value = map.get(key)
	if (value === undefined) {
		value = defaultFunc()
		map.set(key, value)
	}
	return value
}

/**
 * @template {string} TKey
 * @template TVal
 * @param {Partial<Record<TKey, TVal>>} obj
 * @param {TKey} key
 * @param {() => TVal} defaultFunc
 * @returns {TVal}
 */
export function objGetOrSet(obj, key, defaultFunc) {
	let value = obj[key]
	if (value === undefined) {
		obj[key] = value = defaultFunc()
	}
	return /**@type {TVal}*/ (value)
}

/**
 * @param {unknown} obj
 * @param {(item:unknown) => undefined|true|'skip-children'} func return true to abort iteration
 * @returns {boolean}
 */
export function objForEach(obj, func) {
	const res = func(obj)
	if (res === 'skip-children') return false
	if (res) return true

	if (Array.isArray(obj)) {
		for (const item of obj) if (objForEach(item, func)) return true
	} else if (typeof obj === 'object' && obj !== null) {
		for (const attr in obj) if (objForEach(obj[attr], func)) return true
	}
	return false
}

/**
 * @template T
 * @param {T | T[]} item
 * @returns {T[]}
 */
export function arrOrItemToArr(item) {
	return Array.isArray(item) ? item : [item]
}
/**
 * @template T
 * @param {T[]} arr
 * @returns {T[] | T}
 */
export function arrItemIfSingle(arr) {
	return arr.length === 1 ? arr[0] : arr
}
