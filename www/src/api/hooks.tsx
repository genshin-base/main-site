import { useEffect, useRef, useState } from 'preact/hooks'

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
	const [data, setData] = useState<LoadingState<T>>(PENDING)

	useEffect(() => {
		setData(PENDING)
		if (controller.current !== null) controller.current.abort()

		let ac: AbortController | null = new AbortController()
		controller.current = ac

		loadFunc(ac.signal)
			.then(setData)
			.finally(() => (ac = null))

		return () => {
			if (ac !== null) ac.abort()
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, args)

	return data
}
