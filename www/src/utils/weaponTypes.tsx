import icon_Bow from 'src/media/Icon_Bow.png'
import icon_Catalyst from 'src/media/Icon_Catalyst.png'
import icon_Claymore from 'src/media/Icon_Claymore.png'
import icon_Polearm from 'src/media/Icon_Polearm.png'
import icon_Sword from 'src/media/Icon_Sword.png'

import type { GI_WeaponTypeCode } from 'lib/genshin'

export type GI_WeaponType = { readonly code: GI_WeaponTypeCode; imgSrc: string }
export const weaponTypes: GI_WeaponType[] = [
	{ code: 'sword' as const, imgSrc: icon_Sword },
	{ code: 'bow' as const, imgSrc: icon_Bow },
	{ code: 'catalyst' as const, imgSrc: icon_Catalyst },
	{ code: 'claymore' as const, imgSrc: icon_Claymore },
	{ code: 'polearm' as const, imgSrc: icon_Polearm },
]
