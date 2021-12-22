// export type Character = {
// 	code: string,
// 	element:
// }

// export function getCharactersWithElement = (characters, elementCode) = {
// 	return characters.filter(c=> c.element = elementCode)
// }

export function getCharacterFaceIconSrc(code: string): string {
	return process.env.ASSET_PATH + `media/characters/${code}_face.png`
}
