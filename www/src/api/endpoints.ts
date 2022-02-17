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
	apiGetJSONFile(`generated/${prefix}.json?v=${GENERATED_DATA_HASH}`, signal) as Promise<T>

const getLang = <T>(prefix: string, signal: AbortSignal) => get<T>(prefix + '-' + BUNDLE_ENV.LANG, signal)

export function apiGetCharacter(
	code: string,
	signal: AbortSignal,
): Promise<MapAllByCode<CharacterFullInfoWithRelated>> {
	return getLang<CharacterFullInfoWithRelated>(`characters/${code}`, signal).then(mapAllByCode)
}

export function apiGetCharacterRelatedLocs(
	code: string,
	signal: AbortSignal,
): Promise<ExtractedLocationsInfo> {
	return getLang(`characters/${code}-locs`, signal)
}

export function apiGetArtifacts(signal: AbortSignal): Promise<MapAllByCode<ArtifactsFullInfoWithRelated>> {
	return getLang<ArtifactsFullInfoWithRelated>(`artifacts`, signal).then(mapAllByCode)
}

export function apiGetWeapons(signal: AbortSignal): Promise<MapAllByCode<WeaponsFullInfoWithRelated>> {
	return getLang<WeaponsFullInfoWithRelated>(`weapons`, signal).then(mapAllByCode)
}

export function apiMaterialsTimetable(
	signal: AbortSignal,
): Promise<MapAllByCode<MaterialsTimetableWithRelated>> {
	return getLang<MaterialsTimetableWithRelated>(`timetables/materials`, signal).then(mapAllByCode)
}

export function apiGetChangelogs(onlyRecent: boolean, signal: AbortSignal): Promise<ChangelogsTable> {
	return get(`changelogs${onlyRecent ? '-recent' : ''}`, signal)
}
