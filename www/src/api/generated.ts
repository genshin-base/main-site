
import { apiGetJSONFile, mapAllByCode, MapAllByCode } from '#src/api/utils'

const LANG = 'en'

const get = <T>(prefix:string, signal:AbortSignal) =>
	apiGetJSONFile(`generated/${prefix}-${LANG}.json?v=027f59be`, signal) as Promise<T>

import type { CharacterShortInfo } from '#lib/parsing/combine'
export const charactersShortList: CharacterShortInfo[] =
	[{"code":"amber","elementCode":"pyro","weaponTypeCode":"bow","rarity":4},{"code":"xiangling","elementCode":"pyro","weaponTypeCode":"polearm","rarity":4},{"code":"bennett","elementCode":"pyro","weaponTypeCode":"sword","rarity":4},{"code":"xinyan","elementCode":"pyro","weaponTypeCode":"claymore","rarity":4},{"code":"yanfei","elementCode":"pyro","weaponTypeCode":"catalyst","rarity":4},{"code":"thoma","elementCode":"pyro","weaponTypeCode":"polearm","rarity":4},{"code":"diluc","elementCode":"pyro","weaponTypeCode":"claymore","rarity":5},{"code":"klee","elementCode":"pyro","weaponTypeCode":"catalyst","rarity":5},{"code":"hu-tao","elementCode":"pyro","weaponTypeCode":"polearm","rarity":5},{"code":"yoimiya","elementCode":"pyro","weaponTypeCode":"bow","rarity":5},{"code":"fischl","elementCode":"electro","weaponTypeCode":"bow","rarity":4},{"code":"beidou","elementCode":"electro","weaponTypeCode":"claymore","rarity":4},{"code":"lisa","elementCode":"electro","weaponTypeCode":"catalyst","rarity":4},{"code":"razor","elementCode":"electro","weaponTypeCode":"claymore","rarity":4},{"code":"kujou-sara","elementCode":"electro","weaponTypeCode":"bow","rarity":4},{"code":"electro-traveler","elementCode":"electro","weaponTypeCode":"sword","rarity":5},{"code":"keqing","elementCode":"electro","weaponTypeCode":"sword","rarity":5},{"code":"raiden-shogun","elementCode":"electro","weaponTypeCode":"polearm","rarity":5},{"code":"xingqiu","elementCode":"hydro","weaponTypeCode":"sword","rarity":4},{"code":"barbara","elementCode":"hydro","weaponTypeCode":"catalyst","rarity":4},{"code":"tartaglia","elementCode":"hydro","weaponTypeCode":"bow","rarity":5},{"code":"mona","elementCode":"hydro","weaponTypeCode":"catalyst","rarity":5},{"code":"kokomi","elementCode":"hydro","weaponTypeCode":"catalyst","rarity":5},{"code":"diona","elementCode":"cryo","weaponTypeCode":"bow","rarity":4},{"code":"chongyun","elementCode":"cryo","weaponTypeCode":"claymore","rarity":4},{"code":"kaeya","elementCode":"cryo","weaponTypeCode":"sword","rarity":4},{"code":"rosaria","elementCode":"cryo","weaponTypeCode":"polearm","rarity":4},{"code":"qiqi","elementCode":"cryo","weaponTypeCode":"sword","rarity":5},{"code":"ganyu","elementCode":"cryo","weaponTypeCode":"bow","rarity":5},{"code":"eula","elementCode":"cryo","weaponTypeCode":"claymore","rarity":5},{"code":"ayaka","elementCode":"cryo","weaponTypeCode":"sword","rarity":5},{"code":"aloy","elementCode":"cryo","weaponTypeCode":"bow","rarity":5},{"code":"shenhe","elementCode":"cryo","weaponTypeCode":"polearm","rarity":5},{"code":"sucrose","elementCode":"anemo","weaponTypeCode":"catalyst","rarity":4},{"code":"sayu","elementCode":"anemo","weaponTypeCode":"claymore","rarity":4},{"code":"anemo-traveler","elementCode":"anemo","weaponTypeCode":"sword","rarity":5},{"code":"jean","elementCode":"anemo","weaponTypeCode":"sword","rarity":5},{"code":"venti","elementCode":"anemo","weaponTypeCode":"bow","rarity":5},{"code":"xiao","elementCode":"anemo","weaponTypeCode":"polearm","rarity":5},{"code":"kazuha","elementCode":"anemo","weaponTypeCode":"sword","rarity":5},{"code":"ningguang","elementCode":"geo","weaponTypeCode":"catalyst","rarity":4},{"code":"noelle","elementCode":"geo","weaponTypeCode":"claymore","rarity":4},{"code":"gorou","elementCode":"geo","weaponTypeCode":"bow","rarity":4},{"code":"yun-jin","elementCode":"geo","weaponTypeCode":"polearm","rarity":4},{"code":"geo-traveler","elementCode":"geo","weaponTypeCode":"sword","rarity":5},{"code":"zhongli","elementCode":"geo","weaponTypeCode":"polearm","rarity":5},{"code":"albedo","elementCode":"geo","weaponTypeCode":"sword","rarity":5},{"code":"itto","elementCode":"geo","weaponTypeCode":"claymore","rarity":5}]

import type { CharacterFullInfoWithRelated } from '#lib/parsing/combine'
export function apiGetCharacter(code:string, signal:AbortSignal): Promise<MapAllByCode<CharacterFullInfoWithRelated>> {
	return (get(`characters/${code}`, signal) as Promise<CharacterFullInfoWithRelated>).then(mapAllByCode)
}

import type { ExtractedLocationsInfo } from '#lib/parsing/combine'
export function apiGetCharacterRelatedLocs(code:string, signal:AbortSignal): Promise<ExtractedLocationsInfo> {
	return get(`characters/${code}-locs`, signal) as Promise<ExtractedLocationsInfo>
}

import type { ArtifactsFullInfoWithRelated } from '#lib/parsing/combine'
export function apiGetArtifacts(signal:AbortSignal): Promise<MapAllByCode<ArtifactsFullInfoWithRelated>> {
	return (get(`artifacts`, signal) as Promise<ArtifactsFullInfoWithRelated>).then(mapAllByCode)
}

import type { WeaponsFullInfoWithRelated } from '#lib/parsing/combine'
export function apiGetWeapons(signal:AbortSignal): Promise<MapAllByCode<WeaponsFullInfoWithRelated>> {
	return (get(`weapons`, signal) as Promise<WeaponsFullInfoWithRelated>).then(mapAllByCode)
}

import type { ChangelogsTable } from '#lib/parsing/helperteam/changelogs'
export function apiGetChangelogs(onlyRecent:boolean, signal:AbortSignal): Promise<ChangelogsTable> {
	return get(`changelogs${onlyRecent ? '-recent' : ''}`, signal)
}