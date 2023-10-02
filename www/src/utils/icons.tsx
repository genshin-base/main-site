export function getIconSrc(code: string): string {
	return BUNDLE_ENV.ASSET_PATH + `media/icons/${code}.png`
}
