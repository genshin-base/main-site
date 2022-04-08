import { isPromise } from '#lib/utils/values'
import { GENERATED_DATA_HASH } from './generated'
import { apiGetJSONFile, mapAllByCode, MapAllByCode } from './utils'

import type {
	ArtifactsRegularInfoWithRelated,
	CharacterFullInfoWithRelated,
	ExtractedLocationsInfo,
	MaterialsTimetableWithRelated,
	WeaponsRegularInfoWithRelated,
} from '#lib/parsing/combine'

const get = <T>(prefix: string, signal: AbortSignal) =>
	apiGetJSONFile<T>(`generated/${prefix}.json?v=${GENERATED_DATA_HASH}`, signal)

const getLang = <T>(prefix: string, signal: AbortSignal) => get<T>(prefix + '-' + BUNDLE_ENV.LANG, signal)

type PromiseOrSync<T> = Promise<T> | T

const _map = <T, R>(val: PromiseOrSync<T>, func: (v: T) => R): PromiseOrSync<R> =>
	isPromise(val) ? val.then(func) : func(val)

export function apiGetCharacter(
	code: string,
	signal: AbortSignal,
): PromiseOrSync<MapAllByCode<CharacterFullInfoWithRelated>> {
	return _map(getLang<CharacterFullInfoWithRelated>(`characters/${code}`, signal), mapAllByCode)
}

export function apiGetCharacterRelatedLocs(
	code: string,
	signal: AbortSignal,
): PromiseOrSync<ExtractedLocationsInfo> {
	return getLang(`characters/${code}-locs`, signal)
}

export function apiGetArtifacts(
	signal: AbortSignal,
): PromiseOrSync<MapAllByCode<ArtifactsRegularInfoWithRelated>> {
	return _map(getLang<ArtifactsRegularInfoWithRelated>(`artifacts`, signal), mapAllByCode)
}

export function apiGetWeapons(
	signal: AbortSignal,
): PromiseOrSync<MapAllByCode<WeaponsRegularInfoWithRelated>> {
	return _map(getLang<WeaponsRegularInfoWithRelated>(`weapons`, signal), mapAllByCode)
}

export function apiMaterialsTimetable(
	signal: AbortSignal,
): PromiseOrSync<MapAllByCode<MaterialsTimetableWithRelated>> {
	return _map(getLang<MaterialsTimetableWithRelated>(`timetables/materials`, signal), mapAllByCode)
}
