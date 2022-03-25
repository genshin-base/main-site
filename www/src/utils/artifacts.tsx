import { GI_ARTIFACT_GROUP_CODES, GI_ArtifactTypeCode } from '#lib/genshin'
import { ART_GROUP_CODES } from '#src/api/generated'
import icon_circlet from '#src/media/circlet.png'
import icon_flower from '#src/media/flower.png'
import icon_goblet from '#src/media/goblet.png'
import icon_plume from '#src/media/plume.png'
import icon_sands from '#src/media/sands.png'

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

function isGroup(code: string) {
	return (GI_ARTIFACT_GROUP_CODES as string[]).includes(code)
}

export function getArtifactIconSrc(artifactCode: string): string {
	return isGroup(artifactCode) ? icon_flower : BUNDLE_ENV.ASSET_PATH + `media/artifacts/${artifactCode}.png`
}

export function getArtifactIconLargeSrc(artifactCode: string): string {
	return isGroup(artifactCode)
		? icon_flower
		: BUNDLE_ENV.ASSET_PATH + `media/artifacts/${artifactCode}.large.png`
}

function getAllOrNone<T>(codes: string[], map: Map<string, T>) {
	const res: T[] = []
	for (const code of codes) {
		const item = map.get(code)
		if (!item) return []
		res.push(item)
	}
	return res
}
export function getAllArtifacts<T>(code: string, artsMap: Map<string, T>): T[] {
	if (code in ART_GROUP_CODES) return getAllOrNone(ART_GROUP_CODES[code], artsMap)
	return getAllOrNone([code], artsMap)
}
