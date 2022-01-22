export function getEnemyIconSrc(enemyCode: string): string {
	return process.env.ASSET_PATH + `media/enemies/${enemyCode}.png`
}
