import { charactersShortList } from './generated'

export function makeCharacterBuildHash(characterCode: string): string {
	return '#~' + characterCode
}

export function makeCharacterBuildDeselectHash(): string {
	return '#'
}

export function getCharacterCodeFromHash(): string | null {
	const hash = location.hash.slice(1)
	if (hash.startsWith('~')) {
		const code = hash.slice(1).toLocaleLowerCase()
		if (charactersShortList.some(x => x.code === code)) return code
	}
	return null
}
