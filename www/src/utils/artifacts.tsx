import icon_flower from '#src/media/flower.png'
import icon_plume from '#src/media/plume.png'
import icon_sands from '#src/media/sands.png'
import icon_goblet from '#src/media/goblet.png'
import icon_circlet from '#src/media/circlet.png'

import type { GI_ArtifactTypeCode } from '#lib/genshin'

export type GI_ArtifactType = { readonly code: GI_ArtifactTypeCode; imgSrc: string }
export const artifactTypes: GI_ArtifactType[] = [
	{ code: 'flower' as const, imgSrc: icon_flower },
	{ code: 'plume' as const, imgSrc: icon_plume },
	{ code: 'sands' as const, imgSrc: icon_sands },
	{ code: 'goblet' as const, imgSrc: icon_goblet },
	{ code: 'circlet' as const, imgSrc: icon_circlet },
]
export function getArtifactTypeIconSrc(artifactTypeCode: string): string {
	return (artifactTypes.find(at => at.code === artifactTypeCode) || artifactTypes[0]).imgSrc
}
export function getArtifactIconSrc(artifactCode: string): string {
	return artifactCode === '18%-atk' || artifactCode === '20%-er'
		? getArtifactTypeIconSrc('flower')
		: process.env.ASSET_PATH + `media/artifacts/${artifactCode}.png`
}
