export function getItemIconSrc(itemCode: string): string {
	return BUNDLE_ENV.ASSET_PATH + `media/items/${itemCode}.png`
}
