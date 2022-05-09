export const WEAPON_ROW_CARD_HASH_KEY = 'w'
export const ARTIFACT_ROW_CARD_HASH_KEY = 'a'
const keyMap = {
	weapon: WEAPON_ROW_CARD_HASH_KEY,
	artifact: ARTIFACT_ROW_CARD_HASH_KEY,
}
export const genEquipmentHash = (type: 'weapon' | 'artifact', code: string): string => {
	return `#${keyMap[type]}=${code}`
}
