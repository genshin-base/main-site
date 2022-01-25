import { charactersShortList } from '#src/generated'
import { makeCharacterBuildHash } from '#src/hashstore'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { ItemAvatar } from '../item-cards/item-cards'

export function LastUsedCharacters() {
	const characterCodes = ['amber', 'bennett', 'kokomi']
	const charactersElems = characterCodes.map(code => (
		<ItemAvatar
			src={getCharacterAvatarSrc(code)}
			// rarity={charactersShortList.find(x => x.code === code)?.rarity ?? 5}
			classes="mb-1 me-1 mb-xxl-2 me-xxl-2 small-avatar align-middle"
			key={code}
			hash={makeCharacterBuildHash(code)}
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
