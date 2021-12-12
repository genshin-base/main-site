import icon_Sword from '../media/Icon_Sword.png'
import icon_Bow from '../media/Icon_Bow.png'
import icon_Catalyst from '../media/Icon_Catalyst.png'
import icon_Claymore from '../media/Icon_Claymore.png'
import icon_Polearm from '../media/Icon_Polearm.png'

export type GI_WeaponTypeCode = 'sword' | 'bow' | 'catalyst' | 'claymore' | 'polearm'
export type GI_WeaponType = { readonly code: GI_WeaponTypeCode; imgSrc: string }
export const weaponTypes: GI_WeaponType[] = [
	{ code: 'sword' as const, imgSrc: icon_Sword },
	{ code: 'bow' as const, imgSrc: icon_Bow },
	{ code: 'catalyst' as const, imgSrc: icon_Catalyst },
	{ code: 'claymore' as const, imgSrc: icon_Claymore },
	{ code: 'polearm' as const, imgSrc: icon_Polearm },
]
