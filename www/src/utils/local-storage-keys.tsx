import { guessCurrentRegion } from '#lib/genshin'

//sv - storage versioned
export const SV_SELECTED_REGION_CODE = {
	key: 'selected-region-code',
	versions: [() => guessCurrentRegion()] as const,
}
export const SV_ARE_GREETINGS_VISIBLE = {
	key: 'are-greetings-visible',
	versions: [() => true] as const,
}

export type SV_FavCodes = string[]
const favCodes = (key: string) => ({
	key,
	versions: [() => [] as SV_FavCodes] as const,
})
export const SV_FAV_CHAR_CODES = favCodes('favoriteCharacterCodes')
export const SV_FAV_TALENT_MATERIAL_CODES = favCodes('favoriteTalentMaterialCodes')
export const SV_FAV_WEAPON_PRIMARY_MATERIAL_CODES = favCodes('favoriteWeaponPrimaryMaterialCodes')

export type STORAGE_WEAPON_DATA = [weaponCode: string, weaponMaterialCode: string]
export const SV_FAV_WEAPON_DATAS = {
	key: 'favoriteWeaponDatas',
	versions: [() => [] as STORAGE_WEAPON_DATA[]] as const,
}
