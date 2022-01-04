// export type Character = {
// 	code: string,
// 	element:
// }

// export function getCharactersWithElement = (characters, elementCode) = {
// 	return characters.filter(c=> c.element = elementCode)
// }

function unprefixTraveler(code: string) {
	return code.endsWith('-traveler') ? 'traveler' : code
}

export function getCharacterAvatarSrc(code: string): string {
	return process.env.ASSET_PATH + `media/characters/avatars/${unprefixTraveler(code)}.png`
}

export function getCharacterPortraitSrc(code: string): string {
	return process.env.ASSET_PATH + `media/characters/portraits/${unprefixTraveler(code)}.png`
}

export function getCharacterSilhouetteSrc(code: string): string {
	return process.env.ASSET_PATH + `media/characters/silhouettes/${unprefixTraveler(code)}.svg`
}
