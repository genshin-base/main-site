import element_Pyro from '../media/Element_Pyro.png'
import element_Hydro from '../media/Element_Hydro.png'
import element_Anemo from '../media/Element_Anemo.png'
import element_Electro from '../media/Element_Electro.png'
// import element_Dendro from '../media/Element_Dendro.png'
import element_Cryo from '../media/Element_Cryo.png'
import element_Geo from '../media/Element_Geo.png'

export type GI_ElementCode = 'pyro' | 'electro' | 'hydro' | 'cryo' | 'anemo' | 'geo'
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
