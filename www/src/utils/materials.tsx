export function getMaterialIconSrc(materialCode: string): string {
	return process.env.ASSET_PATH + `media/items/${materialCode}.png`
}
//todo нейминг
