import { BlockHeader } from '#src/components/block-header'
import { I18N_FOR_NOBODY, I18N_RECOMMENDED_FOR } from '#src/i18n/i18n'
import { useMemo } from 'preact/hooks'
import { CharacterAvatar } from './item-avatars'

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
		return charCodes.length
			? charCodes.map(c => (
					<CharacterAvatar
						key={c}
						code={c}
						rarity={isAvatarWithBorder ? 4 : undefined}
						isNoBg={!navigateToCharacter}
						classes={`small-avatar mb-2 me-2`}
						href={navigateToCharacter ? '/builds/' + c : undefined}
					/>
			  ))
			: I18N_FOR_NOBODY
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
