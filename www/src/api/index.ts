import { useMemo } from 'preact/hooks'

import { decodeLocations } from '#lib/genshin'
import {
	CharacterFullInfoWithRelated,
	EnemyShortInfo,
	ExtractedLocationsInfo,
	ItemShortInfo,
} from '#lib/parsing/combine'
import { promiseNever } from '#lib/utils/values'
import { isLoaded, LoadingState, useFetch, useFetchWithPrev } from '#src/utils/hooks'
import { apiGetCharacter, apiGetCharacterRelatedLocs } from './generated'
import { MapAllByCode, mapAllByCode } from './utils'

export function useBuildWithDelayedLocs(
	characterCode: string,
): [build: LoadingState<MapAllByCode<CharacterFullInfoWithRelated>>, isUpdating: boolean] {
	const [build, isUpdating] = useFetchWithPrev(sig => apiGetCharacter(characterCode, sig), [characterCode])
	const buildIsLoaded = isLoaded(build)

	const locs = useFetch(
		sig =>
			buildIsLoaded
				? apiGetCharacterRelatedLocs(characterCode, sig) //
				: promiseNever(), //не загружаем локации, пока не загрузится до конца билд
		[characterCode, buildIsLoaded],
	)

	const buildWithLocs = useMemo(
		() => (buildIsLoaded && isLoaded(locs) ? applyFullInfoLocationsImmut(build, locs) : build),
		[build, buildIsLoaded, locs],
	)
	return [buildWithLocs, isUpdating]
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
