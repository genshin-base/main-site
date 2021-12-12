import { useMemo } from 'preact/hooks'

export class Pending {
	_type: 'pending' = 'pending'
}
export const PENDING = new Pending()

export type LoadingState<T> = T | Error | Pending

export function isLoaded<T>(value: LoadingState<T>): value is T {
	return !(value instanceof Pending) && !(value instanceof Error)
}

export function mustBeLoaded<T>(value: LoadingState<T>): T {
	if (!isLoaded(value)) throw new Error('value must not be loaded, got ' + value)
	return value
}

/**
 * @example
 * const user = useFetch(...) //LoadingState<User>
 * const name = getLoadedAttr(user, 'name') //LoadingState<string>
 */
export function getLoadedAttr<T, K extends keyof T>(obj: LoadingState<T>, attr: K): LoadingState<T[K]> {
	return isLoaded(obj) ? obj[attr] : obj
}

/**
 * @example
 * const users = useFetch(...) //LoadingState<User[]>
 * const names = useLoadedKeyMap(users, 'name') //Map<string,User> (пустая, если юзеры не загружены)
 */
export function useLoadedKeyMap<T, K extends keyof T>(obj: LoadingState<T[]>, attr: K): Map<T[K], T> {
	return useMemo(() => {
		const map: Map<T[K], T> = new Map()
		if (!isLoaded(obj)) return map
		for (const item of obj) map.set(item[attr], item)
		return map
	}, [obj, attr])
}
