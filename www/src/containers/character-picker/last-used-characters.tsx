import { CharacterAvatar } from 'src/components/characters'
import character_Amber_Thumb from '../../media/Character_Amber_Thumb.png'

export function LastUsedCharacters({ onCharacterSelect }: { onCharacterSelect: (any) => void }) {
	const characters = [4, 5, 5, 4]
	const charactersElems = characters.map(ch => (
		<CharacterAvatar
			src={character_Amber_Thumb}
			rarity={ch === 4 ? `4-star` : '5-star'}
			classes="mb-1 me-1 mb-xxl-2 me-xxl-2 small"
			onClick={() => {
				onCharacterSelect(ch)
			}}
		/>
	))
	return (
		<div className="last-used-characters float-xl-end py-sm-1 py-2">
			<label className="opacity-75 pe-2 mb-sm-1">Last used characters: </label>
			<br className="d-xl-none" />
			<div class="d-inline">{charactersElems}</div>
		</div>
	)
}
