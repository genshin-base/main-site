import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'

import { decodeLocations } from '#lib/genshin'
import {
	CharacterFullInfoWithRelated,
	EnemyShortInfo,
	ExtractedLocationsInfo,
	ItemShortInfo,
} from '#lib/parsing/combine'
import { promiseNever } from '#src/../../lib/utils/values'
import { apiGetCharacter, apiGetCharacterRelatedLocs } from '#src/generated'
import { BS_BreakpointCode, BS_getCurrBreakpoint } from '#src/utils/bootstrap'
import { mapAllByCode, MapAllByCode } from './'

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

export function useBuildWithDelayedLocs(
	characterCode: string,
): LoadingState<MapAllByCode<CharacterFullInfoWithRelated>> {
	const build = useFetch(sig => apiGetCharacter(characterCode, sig), [characterCode])
	const buildIsLoaded = isLoaded(build)

	const locs = useFetch(
		sig =>
			buildIsLoaded
				? apiGetCharacterRelatedLocs(characterCode, sig) //
				: promiseNever(), //не загружаем локации, пока не загрузится до конца билд
		[characterCode, buildIsLoaded],
	)

	return useMemo(
		() => (buildIsLoaded && isLoaded(locs) ? applyFullInfoLocationsImmut(build, locs) : build),
		[build, buildIsLoaded, locs],
	)
}
function applyFullInfoLocationsImmut(
	fullInfo: MapAllByCode<CharacterFullInfoWithRelated>,
	locsInfo: ExtractedLocationsInfo,
): MapAllByCode<CharacterFullInfoWithRelated> {
	const items = applyItemsLocationsImmut(fullInfo.items, locsInfo.items)
	const enemies = applyItemsLocationsImmut(fullInfo.enemies, locsInfo.enemies)
	return mapAllByCode({ ...fullInfo, items, enemies })
}
function applyItemsLocationsImmut<T extends ItemShortInfo | EnemyShortInfo>(
	items: T[],
	locItems: Record<string, string>,
): T[] {
	let resItems = items
	for (let i = 0; i < items.length; i++) {
		const locs = locItems[items[i].code]
		if (locs) {
			if (resItems === items) resItems = items.slice()
			resItems[i] = { ...items[i], locations: decodeLocations(locs) }
		}
	}
	return resItems
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
