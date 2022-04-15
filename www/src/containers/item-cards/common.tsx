import { useMemo } from 'preact/hooks'

import { ItemShortInfo } from '#lib/parsing/combine'
import { mappedArrPush } from '#lib/utils/collections'
import { I18N_ASC_MATERIALS, I18N_FOR_NOBODY, I18N_RECOMMENDED_FOR } from '#src/i18n/i18n'
import { getItemIconSrc } from '#src/utils/items'
import { CharacterAvatar, ItemAvatar } from './item-avatars'

export function RecommendedTo({
	charCodes,
	isInline = false,
	isAvatarWithBorder = false,
	navigateToCharacter = false,
}: {
	charCodes: (string | { count: number; code: string })[]
	isInline?: boolean
	navigateToCharacter?: boolean
	isAvatarWithBorder?: boolean
}): JSX.Element {
	const charLists = useMemo(() => {
		const groupsMap = new Map<number, string[]>()
		for (const item of charCodes) {
			if (typeof item === 'string') {
				mappedArrPush(groupsMap, 0, item)
			} else {
				mappedArrPush(groupsMap, item.count, item.code)
			}
		}
		console.log(groupsMap, charCodes)
		const groups = Array.from(groupsMap.entries())
		groups.sort(([countA], [countB]) => countB - countA)
		groups.forEach(([, codes]) => codes.reverse()) //сначала новые персонажи (по умолчанию они в конце)

		if (groups.every(([, codes]) => codes.length === 0))
			return <span class={`align-middle ${isInline ? 'py-1' : ''}`}>{I18N_FOR_NOBODY}</span>

		return groups.map(([count, codes]) => (
			<div>
				{count !== 0 && 'x' + count + ': '}
				{codes.map(c => (
					<CharacterAvatar
						key={c}
						code={c}
						rarity={isAvatarWithBorder ? 4 : undefined}
						isNoBg={!navigateToCharacter}
						classes={`small-avatar mb-2 me-2`}
						href={navigateToCharacter ? '/builds/' + c : undefined}
					/>
				))}
			</div>
		))
	}, [charCodes, isInline, navigateToCharacter, isAvatarWithBorder])
	return (
		<div class={`d-flex ${isInline ? 'flex-row' : 'flex-column'}`}>
			<label class="opacity-75 pe-2 align-middle py-1">
				{I18N_RECOMMENDED_FOR}
				{isInline ? ':' : ''}
			</label>
			{charLists}
		</div>
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
