import { isPromise } from '#lib/utils/values'
import { GENERATED_DATA_HASH } from './generated'
import { apiGetJSONFile, mapAllByCode, MapAllByCode } from './utils'

import type {
	ArtifactsFullInfoWithRelated,
	CharacterFullInfoWithRelated,
	ExtractedLocationsInfo,
	MaterialsTimetableWithRelated,
	WeaponsFullInfoWithRelated,
} from '#lib/parsing/combine'
import type { ChangelogsTable } from '#lib/parsing/helperteam/types'

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
): PromiseOrSync<MapAllByCode<ArtifactsFullInfoWithRelated>> {
	return _map(getLang<ArtifactsFullInfoWithRelated>(`artifacts`, signal), mapAllByCode)
}

export function apiGetWeapons(signal: AbortSignal): PromiseOrSync<MapAllByCode<WeaponsFullInfoWithRelated>> {
	return _map(getLang<WeaponsFullInfoWithRelated>(`weapons`, signal), mapAllByCode)
}

export function apiMaterialsTimetable(
	signal: AbortSignal,
): PromiseOrSync<MapAllByCode<MaterialsTimetableWithRelated>> {
	return _map(getLang<MaterialsTimetableWithRelated>(`timetables/materials`, signal), mapAllByCode)
}

export function apiGetChangelogs(onlyRecent: boolean, signal: AbortSignal): PromiseOrSync<ChangelogsTable> {
	return get(`changelogs${onlyRecent ? '-recent' : ''}`, signal)
}
