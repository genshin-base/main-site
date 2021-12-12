import { CharacterPicker } from 'src/containers/character-picker/character-picker'
import { LastUsedCharacters } from 'src/containers/character-picker/last-used-characters'
import './builds.scss'

export function Builds() {
	const onCharacterSelect = character => {
		console.log(character)
	}
	return (
		<div className="builds container">
			<h1 className="my-1">Character builds recomendations</h1>
			<h5 className="mt-2 mb-3 opacity-75">Select character above</h5>
			<LastUsedCharacters onCharacterSelect={onCharacterSelect} />
			<CharacterPicker />
			<a
				href="https://docs.google.com/spreadsheets/d/1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI/pubhtml#"
				className="fs-6 d-block my-3 opacity-75"
			>
				Based on Genshin Impact Helper Team's Character Builds
			</a>
		</div>
	)
}
