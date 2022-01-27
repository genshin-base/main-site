import { charactersShortList } from '#src/api/generated'
import { makeCharacterBuildHash } from '#src/hashstore'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { useEffect, useMemo } from 'preact/hooks'
import { ItemAvatar } from '../item-cards/item-cards'

export function FavouriteCharacters({
	classes = '',
	onCharacterSelect,
	shoudSelectFirst,
}: {
	classes?: string
	onCharacterSelect?(characterCode: string): void
	shoudSelectFirst?: boolean
}): JSX.Element {
	const characterCodes = ['amber', 'bennett', 'kokomi', 'amber', 'bennett', 'kokomi'] //todo
	const charactersElems = useMemo(
		() =>
			characterCodes.map(code => (
				<ItemAvatar
					src={getCharacterAvatarSrc(code)}
					// rarity={charactersShortList.find(x => x.code === code)?.rarity ?? 5}
					classes="mb-1 me-1 mb-xxl-2 me-xxl-2 small-avatar align-middle"
					key={code}
					hash={makeCharacterBuildHash(code)}
					onClick={() => onCharacterSelect && onCharacterSelect(code)}
				/>
			)),
		[characterCodes, onCharacterSelect],
	)
	useEffect(() => onCharacterSelect && onCharacterSelect(characterCodes[0]), [])
	return (
		<div className={`last-used-characters py-sm-1 py-2 ${classes}`}>
			<label className="opacity-75 pe-2 mb-sm-1">Favourite characters: </label>
			<br className="d-xl-none" />
			<div class="d-inline">{charactersElems}</div>
		</div>
	)
}
