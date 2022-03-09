import { useEffect, useMemo } from 'preact/hooks'

import { charactersShortList } from '#src/api/generated'
import { I18N_FAV_CHARACTERS } from '#src/i18n/i18n'
import { MAX_SMTHS_TO_STORE } from '#src/modules/builds/common'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { elements } from '#src/utils/elements'
import { useLocalStorage } from '#src/utils/hooks'
import { ItemAvatar } from '../item-cards/item-avatars'

const codeToBadge = (code: string) => {
	const e = elements.find(e => code === `traveler-${e.code}`)
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

	useEffect(() => {
		shoudSelectFirst && onCharacterSelect && onCharacterSelect(characterCodes[0])
	}, [onCharacterSelect, characterCodes, shoudSelectFirst])

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
	return (
		<div className={`favourite-characters ${classes}`}>
			<label className="opacity-75 pe-2 align-middle py-1">{I18N_FAV_CHARACTERS}</label>
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
