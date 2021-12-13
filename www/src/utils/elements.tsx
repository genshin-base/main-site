import element_Anemo from 'src/media/Element_Anemo.png'
// import element_Dendro from 'src/media/Element_Dendro.png'
import element_Cryo from 'src/media/Element_Cryo.png'
import element_Electro from 'src/media/Element_Electro.png'
import element_Geo from 'src/media/Element_Geo.png'
import element_Hydro from 'src/media/Element_Hydro.png'
import element_Pyro from 'src/media/Element_Pyro.png'

import type { GI_ElementCode } from 'lib/genshin'

export type GI_Element = { readonly code: GI_ElementCode; imgSrc: string }
export const elements: GI_Element[] = [
	{ code: 'pyro' as const, imgSrc: element_Pyro },
	{ code: 'hydro' as const, imgSrc: element_Hydro },
	{ code: 'anemo' as const, imgSrc: element_Anemo },
	{ code: 'electro' as const, imgSrc: element_Electro },
	// { code: 'dendro' as const , imgSrc: element_Dendro },
	{ code: 'cryo' as const, imgSrc: element_Cryo },
	{ code: 'geo' as const, imgSrc: element_Geo },
]
