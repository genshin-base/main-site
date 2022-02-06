export function getEnemyIconSrc(enemyCode: string): string {
	return BUNDLE_ENV.ASSET_PATH + `media/enemies/${enemyCode}.png`
}
