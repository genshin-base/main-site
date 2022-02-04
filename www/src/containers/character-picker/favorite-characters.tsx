import { useEffect, useMemo } from 'preact/hooks'

import { charactersShortList } from '#src/api/generated'
import { SimpleSelect } from '#src/components/select'
import { MAX_CHARACTERS_TO_STORE } from '#src/modules/builds/common'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { useLocalStorage } from '#src/utils/hooks'
import { ItemAvatar } from '../item-cards/item-cards'

export function FavoriteCharacters({
	classes = '',
	onCharacterSelect,
	shoudSelectFirst,
	makeCharacterHash,
}: {
	classes?: string
	onCharacterSelect?(characterCode: string): void
	shoudSelectFirst?: boolean
	makeCharacterHash?(code: string): string
}): JSX.Element {
	const [favCharCodes] = useLocalStorage<string[]>('favoriteCharacterCodes', [])
	//todo sort characters by release date
	const charactersShortListCodes = useMemo(
		() => charactersShortList.map(c => c.code).filter(c => (~favCharCodes.indexOf(c) ? false : c)),
		[favCharCodes],
	)
	const characterCodes =
		favCharCodes.length < MAX_CHARACTERS_TO_STORE
			? favCharCodes.concat(
					charactersShortListCodes.slice(0, MAX_CHARACTERS_TO_STORE - favCharCodes.length),
			  )
			: favCharCodes.slice(0, MAX_CHARACTERS_TO_STORE)
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
					classes="mb-1 me-1 mb-xxl-2 me-xxl-2 small-avatar align-middle"
					key={code}
					hash={makeCharacterHash && makeCharacterHash(code)}
					onClick={() => onCharacterSelect && onCharacterSelect(code)}
				/>
			)),
		[characterCodes, onCharacterSelect, makeCharacterHash],
	)
	useEffect(() => {
		shoudSelectFirst && onCharacterSelect && onCharacterSelect(characterCodes[0])
	}, [onCharacterSelect, characterCodes, shoudSelectFirst])
	return (
		<div className={`last-used-characters py-sm-1 py-2 ${classes}`}>
			<label className="opacity-75 pe-2 mb-sm-1 align-middle ">Favorite characters: </label>
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
