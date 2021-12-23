// export type Character = {
// 	code: string,
// 	element:
// }

// export function getCharactersWithElement = (characters, elementCode) = {
// 	return characters.filter(c=> c.element = elementCode)
// }

export function getCharacterAvatarSrc(code: string): string {
	return process.env.ASSET_PATH + `media/characters/avatars/${code}.png`
}

export function getCharacterPortraitSrc(code: string): string {
	return process.env.ASSET_PATH + `media/characters/portraits/${code}.png`
}

export function getCharacterSilhouetteSrc(code: string): string {
	return process.env.ASSET_PATH + `media/characters/silhouettes/${code}.svg`
}
