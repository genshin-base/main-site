import { RefObject } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

import { arrShallowEqual } from '#lib/utils/collections'
import { isPromise } from '#lib/utils/values'
import { BS_BreakpointCode, BS_getCurrBreakpoint } from '#src/utils/bootstrap'

type Pending = { _type: 'pending' }

export const PENDING: Pending = {} as never

export type LoadingState<T> = T | Error | Pending

export function isLoaded<T>(value: LoadingState<T>): value is T {
	return value !== PENDING && !(value instanceof Error)
}

export function useFetch<T>(
	loadFunc: (abortSignal: AbortSignal) => T,
	args: unknown[],
): LoadingState<Awaited<T>> {
	const controller = useRef<AbortController | null>(null)
	const prevArgs = useRef<unknown[] | null>(null)
	const data = useRef<LoadingState<Awaited<T>>>(PENDING)
	const foceUpdate = useForceUpdate()

	if (prevArgs.current === null || !arrShallowEqual(prevArgs.current, args)) {
		if (controller.current !== null) controller.current.abort()
		const ac: AbortController | null = new AbortController()
		controller.current = ac

		const res = loadFunc(ac.signal)
		if (isPromise(res)) {
			res.then(res => (data.current = res as Awaited<T>))
				.catch(err => (data.current = err))
				.finally(foceUpdate)
			data.current = PENDING
		} else {
			data.current = res as Awaited<T>
		}

		prevArgs.current = args
	}

	// абортим при отмонтировании компонента
	useEffect(() => {
		return () => {
			if (controller.current !== null) controller.current.abort()
		}
	}, [])
	return data.current
}

export function useFetchWithPrev<T>(
	loadFunc: (abortSignal: AbortSignal) => Promise<T> | T,
	args: unknown[],
): [data: LoadingState<T>, isUpdating: boolean] {
	const prevDataRef = useRef<LoadingState<T>>(PENDING)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	const data = useFetch(loadFunc, args)
	if (isLoaded(data)) prevDataRef.current = data
	return [isLoaded(data) ? data : prevDataRef.current, data === PENDING]
}

export const useToggle = (initial: boolean): [boolean, () => void] => {
	const [flagState, setFlagState] = useState(initial)
	return [flagState, useCallback(() => setFlagState(status => !status), [])]
}

export const useClickAway = (ref: preact.RefObject<HTMLElement>, callback?: () => void): void => {
	const handleClick = (e: MouseEvent | TouchEvent) => {
		if (ref.current && e.target instanceof HTMLElement && !ref.current.contains(e.target)) {
			callback && callback()
		}
	}
	useEffect(() => {
		document.addEventListener('mousedown', handleClick)
		document.addEventListener('touchstart', handleClick)
		// document.addEventListener('click', handleClick)
		return () => {
			document.removeEventListener('mousedown', handleClick)
			document.removeEventListener('touchstart', handleClick)
			// document.removeEventListener('click', handleClick)
		}
	})
}

interface WindowSize {
	width: number | undefined
	height: number | undefined
	breakpoint: BS_BreakpointCode
}
export function useWindowSize(): WindowSize {
	const [windowSize, setWindowSize] = useState<WindowSize>({
		width: window?.innerWidth,
		height: window?.innerHeight,
		breakpoint: BS_getCurrBreakpoint(window?.innerWidth || 0),
	})
	useEffect(() => {
		function handleResize() {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
				breakpoint: BS_getCurrBreakpoint(window.innerWidth),
			})
		}
		window.addEventListener('resize', handleResize)
		handleResize()
		return () => window.removeEventListener('resize', handleResize)
	}, [])
	return windowSize
}

declare global {
	interface WindowEventMap {
		'x-local-tab-storage': CustomEvent & { detail: { key: string } }
	}
}

export function useLocalStorage<T>(key: string, initialValue: T): [T, (val: T) => unknown] {
	const [value, setValueInner] = useState(() => {
		try {
			const curRecord = localStorage.getItem(key) //reading 'localStorage' from window may fail with SecurityError
			return curRecord ? JSON.parse(curRecord) : initialValue //JSON parsing may fail
		} catch (ex) {
			console.error(ex)
			return initialValue
		}
	})

	const setValueAndSave = useCallback(
		(val: T) => {
			try {
				localStorage.setItem(key, JSON.stringify(val)) //reading 'localStorage' from window may fail with SecurityError
			} catch (ex) {
				// ¯\_(ツ)_/¯
			}
			setValueInner(val)
			dispatchEvent(new CustomEvent('x-local-tab-storage', { detail: { key } }))
		},
		[key],
	)

	useEffect(() => {
		function onStorage(e: StorageEvent | { detail: { key: string } }) {
			const affectedKey = 'detail' in e ? e.detail.key : e.key
			if (affectedKey === key) {
				try {
					const curRecord = localStorage.getItem(key) //reading 'localStorage' from window may fail with SecurityError
					if (curRecord) setValueInner(JSON.parse(curRecord)) //JSON parsing may fail
				} catch (ex) {
					console.log(ex)
				}
			}
		}
		addEventListener('storage', onStorage)
		addEventListener('x-local-tab-storage', onStorage)
		return () => {
			removeEventListener('storage', onStorage)
			removeEventListener('x-local-tab-storage', onStorage)
		}
	}, [key])

	return [value, setValueAndSave]
}

export function useHover<T extends Element>(): [RefObject<T>, boolean] {
	const [value, setValue] = useState<boolean>(false)
	const ref = useRef<T | null>(null)
	useEffect(
		() => {
			const node = ref.current
			if (!node) return

			const handleMouseOver = () => setValue(true)
			const handleMouseOut = () => setValue(false)
			node.addEventListener('mouseover', handleMouseOver)
			node.addEventListener('mouseout', handleMouseOut)
			return () => {
				setValue(false)
				node.removeEventListener('mouseover', handleMouseOver)
				node.removeEventListener('mouseout', handleMouseOut)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ref.current],
	)
	return [ref, value]
}

export const useWindowVisibility = () => {
	const [isVisible, setIsVisible] = useState(
		// Focus for first render
		BUNDLE_ENV.IS_SSR ? true : document.visibilityState === 'visible',
	)
	useEffect(() => {
		const onVisibilityChange = () => setIsVisible(document.visibilityState === 'visible')
		const onPageHide = () => setIsVisible(false)
		const onPageShow = () => setIsVisible(true)
		document.addEventListener('visibilitychange', onVisibilityChange)
		window.addEventListener('pagehide', onPageHide)
		window.addEventListener('pageshow ', onPageShow)
		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange)
			window.removeEventListener('pagehide', onPageHide)
			window.removeEventListener('pageshow ', onPageShow)
		}
	}, [])
	return isVisible
}
/*
 * not used
 *
export function useInterval(callback: () => void, delay: number | null) {
	const savedCallback = useRef(callback)
	// Remember the latest callback if it changes.
	useLayoutEffect(() => {
		savedCallback.current = callback
	}, [callback])

	// Set up the interval.
	useEffect(() => {
		// Don't schedule if no delay is specified.
		// Note: 0 is a valid value for delay.
		if (!delay && delay !== 0) {
			return
		}

		const id = setInterval(() => savedCallback.current(), delay)
		return () => clearInterval(id)
	}, [delay])
}
*/
export function useForceUpdate(): () => void {
	const setValue = useState(0)[1]
	return useRef(() => setValue(v => ~v)).current
}
export function useVisibleTicker(callback: () => void, interval: number) {
	const isVisible = useWindowVisibility()

	useEffect(() => {
		if (!isVisible) return
		let id
		function callbackInner() {
			callback()
			id = setTimeout(callbackInner, interval - (Date.now() % interval) + 10)
		}
		callbackInner()
		return () => clearTimeout(id)
		// калбек не должен перезапускать таймер
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [interval, isVisible])
}
