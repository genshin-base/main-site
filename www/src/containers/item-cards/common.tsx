import { ItemShortInfo } from '#src/../../lib/parsing/combine'
import { BlockHeader } from '#src/components/block-header'
import { I18N_ASC_MATERIALS, I18N_FOR_NOBODY, I18N_RECOMMENDED_FOR } from '#src/i18n/i18n'
import { getItemIconSrc } from '#src/utils/items'
import { useMemo } from 'preact/hooks'
import { CharacterAvatar, ItemAvatar } from './item-avatars'

export function RecommendedTo({
	charCodes,
	isInline = false,
	isAvatarWithBorder = false,
	navigateToCharacter = false,
}: {
	charCodes: string[]
	isInline?: boolean
	navigateToCharacter?: boolean
	isAvatarWithBorder?: boolean
}): JSX.Element {
	const charList = useMemo(() => {
		return charCodes.length ? (
			charCodes.map(c => (
				<CharacterAvatar
					key={c}
					code={c}
					rarity={isAvatarWithBorder ? 4 : undefined}
					isNoBg={!navigateToCharacter}
					classes={`small-avatar mb-2 me-2`}
					href={navigateToCharacter ? '/builds/' + c : undefined}
				/>
			))
		) : (
			<span className="align-middle">{I18N_FOR_NOBODY}</span>
		)
	}, [charCodes, navigateToCharacter, isAvatarWithBorder])
	return isInline ? (
		<>
			<label className="opacity-75 pe-2 align-middle py-1">{I18N_RECOMMENDED_FOR}:</label>
			{charList}
		</>
	) : (
		<>
			<BlockHeader>{I18N_RECOMMENDED_FOR}</BlockHeader>
			{charList}
		</>
	)
}
export function AscMaterials({
	materials,
	selectedMat,
	onMatSelect,
}: {
	materials: ItemShortInfo[]
	selectedMat?: ItemShortInfo
	onMatSelect: (ItemShortInfo) => unknown
}): JSX.Element {
	const matList = useMemo(
		() =>
			materials.length
				? materials.map(m => (
						<ItemAvatar
							key={m.code}
							rarity={2}
							classes={`mb-2 mx-1 small-avatar with-padding ${
								selectedMat?.code !== m.code && 'opacity-50'
							}`}
							src={getItemIconSrc(m.code)}
							onClick={() => onMatSelect(m)}
						/>
				  ))
				: null,
		[materials, selectedMat, onMatSelect],
	)
	return (
		<>
			<label className="opacity-75 pe-2 align-middle py-1">{I18N_ASC_MATERIALS}:</label>
			{matList}
		</>
	)
}
