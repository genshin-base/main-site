import { GI_DomainTypeCode } from '#lib/genshin'

export function getDomainIconSrc(domainType: GI_DomainTypeCode): string {
	return process.env.ASSET_PATH + `media/domains/${domainType}.png`
}
