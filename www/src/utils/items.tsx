export function getItemIconSrc(itemCode: string): string {
	return process.env.ASSET_PATH + `media/items/${itemCode}.png`
}
