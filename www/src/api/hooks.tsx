import { useEffect, useRef, useState } from 'preact/hooks'

type Pending = { _type: 'pending' }

export const PENDING: Pending = {} as never

export type LoadingState<T> = T | Error | Pending

export function isLoaded<T>(value: LoadingState<T>): value is T {
	return value !== PENDING && !(value instanceof Error)
}

type DummyPayload = { some: 'data' }
export function useFetchTODO(loadFunc: () => Promise<unknown>, args: unknown[]): LoadingState<DummyPayload> {
	const timoutRef = useRef<number | null>(null)
	const [data, setData] = useState<LoadingState<DummyPayload>>(PENDING)

	useEffect(() => {
		setData(PENDING)

		timoutRef.current = window.setTimeout(
			() => setData(location.hash === '#error' ? new Error('some error') : { some: 'data' }),
			1000,
		)

		return () => {
			if (timoutRef.current !== null) clearTimeout(timoutRef.current)
		}
	}, args)

	return data
}
