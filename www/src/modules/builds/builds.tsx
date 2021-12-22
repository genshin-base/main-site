import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'

import { CharacterPicker } from '#src/containers/character-picker/character-picker'
import { LastUsedCharacters } from '#src/containers/character-picker/last-used-characters'
import { getCharacterCodeFromHash } from '#src/hashstore'
import { CharacterBuildDetailed } from './character-build-detailed'

export function Builds() {
	const [selectedCharacterCode, setSelectedCharacterCode] = useState<string | null>(null)

	const applyHash = useCallback(() => {
		setSelectedCharacterCode(getCharacterCodeFromHash())
	}, [])
	useMemo(applyHash, [applyHash])
	useEffect(() => {
		addEventListener('hashchange', applyHash)
		return () => {
			removeEventListener('hashchange', applyHash)
		}
	}, [applyHash])

	return (
		<div className="builds container">
			<h1 className="my-1">Character builds recomendations</h1>
			{!selectedCharacterCode && <h5 className="mt-2 mb-3 opacity-75">Select character above</h5>}
			<LastUsedCharacters />
			{!selectedCharacterCode ? (
				<CharacterPicker />
			) : (
				<CharacterBuildDetailed selectedCharacterCode={selectedCharacterCode} />
			)}
			<a
				href="https://docs.google.com/spreadsheets/d/1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI/pubhtml#"
				className="fs-6 d-block my-3 text-muted"
			>
				Based on Genshin Impact Helper Team's Character Builds
			</a>
		</div>
	)
}
