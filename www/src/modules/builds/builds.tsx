import { CharacterPicker } from '#src/containers/character-picker/character-picker'
import { FavoriteCharacters } from '#src/containers/character-picker/favorite-characters'
import { CharacterBuildDetailed } from './character-build-detailed'

export function Builds({ code }: { code?: string }) {
	const selectedCharacterCode = code
	return (
		<div className="builds container">
			<h1 className="my-1">Character builds recomendations</h1>
			{!selectedCharacterCode && <h5 className="mt-2 mb-3 opacity-75">Select character above</h5>}
			<FavoriteCharacters navigateToCharacter={true} />
			{!selectedCharacterCode ? (
				<CharacterPicker />
			) : (
				<CharacterBuildDetailed characterCode={selectedCharacterCode} />
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
