export function getItemIconSrc(itemCode: string): string {
	return BUNDLE_ENV.ASSET_PATH + `media/items/${itemCode}.png`
}

export function getItemIconLargeSrc(itemCode: string): string {
	return BUNDLE_ENV.ASSET_PATH + `media/items/${itemCode}.large.png`
}
