import { GI_DomainTypeCode } from '#lib/genshin'

export function getDomainIconSrc(domainType: GI_DomainTypeCode): string {
	return BUNDLE_ENV.ASSET_PATH + `media/domains/${domainType}.png`
}
