import { GI_ServerRegionCode, guessCurrentRegion } from '#lib/genshin'

export const SK_SELECTED_REGION_CODE = 'selected-region-code'
export const SK_DEFAULT_SELECTED_REGION_CODE: GI_ServerRegionCode = guessCurrentRegion()

//sk - storage key
export const SK_FAV_CHAR_CODES = 'favoriteCharacterCodes'
export const SK_FAV_TALENT_MATERIAL_CODES = 'favoriteTalentMaterialCodes'
export const SK_FAV_WEAPON_DATAS = 'favoriteWeaponDatas'
export const SK_FAV_WEAPON_PRIMARY_MATERIAL_CODES = 'favoriteWeaponPrimaryMaterialCodes'
export type STORAGE_WEAPON_DATA = [weaponCode: string, weaponMaterialCode: string]
