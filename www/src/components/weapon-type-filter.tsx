import { GI_WeaponTypeCode } from '#src/../../lib/genshin'
import { ItemAvatar } from '#src/containers/item-cards/item-avatars'
import { weaponTypes } from '#src/utils/weapons'

export function WeaponTypeFilter({
	selectedWeaponTypeCode,
	onTypeCodeSelect,
	classes = '',
}: {
	selectedWeaponTypeCode: GI_WeaponTypeCode | null
	onTypeCodeSelect: (typeCode: GI_WeaponTypeCode) => unknown
	classes?: string
}): JSX.Element {
	return (
		<div className={classes}>
			{weaponTypes.map(wt => (
				<ItemAvatar
					classes={`small-avatar bg-secondary p-1 m-1 webapp-icon-shadow ${
						selectedWeaponTypeCode && selectedWeaponTypeCode !== wt.code ? 'opacity-25' : ''
					}`}
					key={wt.code}
					src={wt.imgSrc}
					onClick={() => onTypeCodeSelect(wt.code)}
				/>
			))}
		</div>
	)
}
