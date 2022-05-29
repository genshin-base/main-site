/**
 * @template T
 * @param {T|null} val
 * @returns {T}
 */
export function mustBeNotNull(val) {
	if (val === null) throw new Error('value is null, this should not happen')
	return val
}

/**
 * @template T
 * @param {T|undefined} val
 * @returns {T}
 */
export function mustBeDefined(val) {
	if (val === undefined) throw new Error('value is undefined, this should not happen')
	return val
}

/**
 * @template T
 * @param {T|undefined} x
 * @returns {x is T}
 */
export function isDefined(x) {
	return x !== undefined
}

/**
 * @param {never[]} values
 * @returns {never}
 */
export function mustBeNever(...values) {
	throw new Error('must not be reachable')
}

/**
 * @param {never[]} values
 * @returns {void}
 */
export function staticNever(...values) {
	// пустая функция, для тайпчекера
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
export function simpleDeepEqual(a, b) {
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false
		for (let i = 0; i < a.length; i++) {
			if (!simpleDeepEqual(a[i], b[i])) return false
		}
		return true
	}
	if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
		if (Object.keys(a).length !== Object.keys(b).length) return false
		for (const attr in a) {
			if (!simpleDeepEqual(a[attr], b[attr])) return false
		}
		return true
	}
	return a === b
}

/**
 * @template TVal
 * @template TKey
 * @param {Iterable<TVal>} items
 * @param {(item:TVal) => TKey} keyFunc
 * @returns {Map<TKey, TVal[]>}
 */
export function groupByToMap(items, keyFunc) {
	const map = /**@type {Map<TKey, TVal[]>}*/ (new Map())
	for (const item of items) {
		const key = keyFunc(item)
		const cur = map.get(key)
		if (cur) cur.push(item)
		else map.set(key, [item])
	}
	return map
}

/**
 * @param {number} min
 * @param {number} val
 * @param {number} max
 * @returns {number}
 */
export function clamp(min, val, max) {
	return val < min ? min : val > max ? max : val
}

/** @returns {Promise<never>} */
export function promiseNever() {
	return new Promise(() => undefined)
}

/**
 * @class
 * @template T
 */
export function Deferred() {
	/** @type {Promise<T>} */
	this.promise = new Promise((res, rej) => {
		this.resolve = res
		this.reject = rej
	})
}

/**
 * @template T
 * @param {T | Promise<T>} value
 * @returns {value is Promise<T>}
 */
export function isPromise(value) {
	return typeof value === 'object' && value !== null && 'then' in value
}
