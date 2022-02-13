import { useEffect, useMemo } from 'preact/hooks'

import { charactersShortList } from '#src/api/generated'
import { MAX_SMTHS_TO_STORE } from '#src/modules/builds/common'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { useLocalStorage } from '#src/utils/hooks'
import { ItemAvatar } from '../item-cards/item-avatars'
import { elements } from '#src/utils/elements'

const codeToBadge = (code: string) => {
	const e = elements.find(e => code === `${e.code}-traveler`)
	return e ? <img className="badge-element-icon d-block ms-n1 mb-n1" src={e.imgSrc} /> : null
}
export function FavoriteCharacters({
	classes = '',
	onCharacterSelect,
	shoudSelectFirst,
	navigateToCharacter,
}: {
	classes?: string
	onCharacterSelect?(characterCode: string): void
	shoudSelectFirst?: boolean
	navigateToCharacter: boolean
}): JSX.Element {
	const [favCharCodes] = useLocalStorage<string[]>('favoriteCharacterCodes', [])
	//todo sort characters by release date
	const charactersShortListCodes = useMemo(
		() => charactersShortList.map(c => c.code).filter(c => (~favCharCodes.indexOf(c) ? false : c)),
		[favCharCodes],
	)
	const characterCodes =
		favCharCodes.length < MAX_SMTHS_TO_STORE
			? favCharCodes.concat(charactersShortListCodes.slice(0, MAX_SMTHS_TO_STORE - favCharCodes.length))
			: favCharCodes.slice(0, MAX_SMTHS_TO_STORE)
	// const optsForSelect = useMemo(
	// 	//todo выпилить или вставить нормальные имена
	// 	() =>
	// 		(characterCodes.length > 4 ? characterCodes.slice(4, characterCodes.length) : []).map(c => {
	// 			return { title: c, code: c }
	// 		}),
	// 	[characterCodes],
	// )
	// const onSelectViaSelect = useCallback(
	// 	opt => {
	// 		onCharacterSelect && onCharacterSelect(opt.code)
	// 	},
	// 	[onCharacterSelect],
	// )
	const charactersElems = useMemo(
		() =>
			characterCodes.map(code => (
				<ItemAvatar
					src={getCharacterAvatarSrc(code)}
					// rarity={charactersShortList.find(x => x.code === code)?.rarity ?? 5}
					classes="me-1 small-avatar"
					key={code}
					href={navigateToCharacter ? '/builds/' + code : undefined}
					onClick={() => onCharacterSelect && onCharacterSelect(code)}
					badgeTopEnd={codeToBadge(code)}
				/>
			)),
		[characterCodes, onCharacterSelect, navigateToCharacter],
	)
	useEffect(() => {
		shoudSelectFirst && onCharacterSelect && onCharacterSelect(characterCodes[0])
	}, [onCharacterSelect, characterCodes, shoudSelectFirst])
	return (
		<div className={`favourite-characters ${classes}`}>
			<label className="opacity-75 pe-2 align-middle py-1">Favorite characters </label>
			<br className="d-xl-none" />
			{charactersElems}
			{/* {optsForSelect.length ? (
				<SimpleSelect
					classes="d-inline w-auto align-top"
					options={optsForSelect}
					onOptionSelect={onSelectViaSelect}
					selectedOption={null}
				/>
			) : null} */}
		</div>
	)
}
