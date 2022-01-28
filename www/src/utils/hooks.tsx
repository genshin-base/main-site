import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

import { BS_BreakpointCode, BS_getCurrBreakpoint } from '#src/utils/bootstrap'
import { RefObject } from 'preact'

type Pending = { _type: 'pending' }

export const PENDING: Pending = {} as never

export type LoadingState<T> = T | Error | Pending

export function isLoaded<T>(value: LoadingState<T>): value is T {
	return value !== PENDING && !(value instanceof Error)
}

export function useFetch<T>(
	loadFunc: (abortSignal: AbortSignal) => Promise<T>,
	args: unknown[],
): LoadingState<T> {
	const controller = useRef<AbortController | null>(null)
	// data обёрнута в массив на случай, если loadFunc
	// вернёт другую функцию: без обёртки её (возвращённую) вызовет setData
	const [data, setData] = useState<[LoadingState<T>]>([PENDING])

	useEffect(() => {
		setData([PENDING])
		if (controller.current !== null) controller.current.abort()

		let ac: AbortController | null = new AbortController()
		controller.current = ac

		loadFunc(ac.signal)
			.then(res => setData([res]))
			.finally(() => (ac = null))

		return () => {
			if (ac !== null) ac.abort()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, args)

	return data[0]
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
		const curRecord = localStorage.getItem(key)
		try {
			return curRecord ? JSON.parse(curRecord) : initialValue
		} catch (ex) {
			console.error(ex)
			return initialValue
		}
	})

	const setValueAndSave = useCallback(
		(val: T) => {
			localStorage.setItem(key, JSON.stringify(val))
			setValueInner(val)
			dispatchEvent(new CustomEvent('x-local-tab-storage', { detail: { key } }))
		},
		[key],
	)

	useEffect(() => {
		function onStorage(e: StorageEvent | { detail: { key: string } }) {
			const affectedKey = 'detail' in e ? e.detail.key : e.key
			if (affectedKey === key) {
				const curRecord = localStorage.getItem(key)
				if (curRecord)
					try {
						setValueInner(JSON.parse(curRecord))
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
export function useHover<T>(): [RefObject<T>, boolean] {
	const [value, setValue] = useState<boolean>(false)
	const ref: any = useRef<T | null>(null)
	const handleMouseOver = (): void => setValue(true)
	const handleMouseOut = (): void => setValue(false)
	useEffect(
		() => {
			const node: any = ref.current
			if (node) {
				node.addEventListener('mouseover', handleMouseOver)
				node.addEventListener('mouseout', handleMouseOut)
				return () => {
					node.removeEventListener('mouseover', handleMouseOver)
					node.removeEventListener('mouseout', handleMouseOut)
				}
			}
		},
		[ref], // Recall only if ref changes
	)
	return [ref, value]
}
