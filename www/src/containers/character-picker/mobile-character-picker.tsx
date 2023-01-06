import { useMemo, useState } from 'preact/hooks'

import { GI_ElementCode, GI_WeaponTypeCode } from '#lib/genshin'
import { apiGetAbyssStats } from '#src/api/endpoints'
import { charactersShortList } from '#src/api/generated'
import { WeaponTypeFilter } from '#src/components/weapon-type-filter'
import { CharacterAvatar, ItemAvatar } from '#src/containers/item-cards/item-avatars'
import { I18N_FILTER } from '#src/i18n/i18n'
import { elements } from '#src/utils/elements'
import { useFetch } from '#src/utils/hooks'
import { getAbyssDataForCharIcon } from './common'

export function CharacterPickerMobile() {
	const [selectedElementCode, setSelectedElementCode] = useState<null | GI_ElementCode>(null)
	const selectElement = el => setSelectedElementCode(selectedElementCode === el.code ? null : el.code)
	const [selectedWeaponTypeCode, setSelectedWeaponTypeCode] = useState<null | GI_WeaponTypeCode>(null)
	const abyssStats = useFetch(apiGetAbyssStats, [])

	const selectWeaponTypeCode = code =>
		setSelectedWeaponTypeCode(selectedWeaponTypeCode === code ? null : code)

	const elementGroups = useMemo(() => {
		const filteredElements = selectedElementCode
			? elements.filter(x => x.code === selectedElementCode)
			: elements
		return filteredElements
			.map(element => ({
				element,
				characters: charactersShortList.filter(
					x =>
						x.elementCode === element.code &&
						(selectedWeaponTypeCode === null || x.weaponTypeCode === selectedWeaponTypeCode),
				),
			}))
			.filter(x => x.characters.length > 0)
	}, [selectedElementCode, selectedWeaponTypeCode])

	const rows = elementGroups.map(({ element, characters }) => (
		<div className="row py-2" key={element.code}>
			<div className="col-2 py-1">
				<ItemAvatar isNoBg={true} classes="d-block mx-auto muted-icon" src={element.imgSrc} />
			</div>
			<div className="col py-31">
				{characters.map(x => {
					const abyssData = getAbyssDataForCharIcon(x.code, abyssStats)
					return (
						<CharacterAvatar
							code={x.code}
							href={'/builds/' + x.code}
							classes={`m-1`}
							borderColor={abyssData?.color}
							badgeTopStart={abyssData?.badge}
						/>
					)
				})}
			</div>
		</div>
	))

	return (
		<div className="character-picker-mobile">
			<div className="m-auto text-center my-3">
				<div className="m-auto">{I18N_FILTER} </div>
				<div className="d-inline">
					<div className="d-inline">
						{elements.map(el => (
							<ItemAvatar
								classes={`small-avatar bg-secondary p-1 m-1 ${
									selectedElementCode && selectedElementCode !== el.code ? 'opacity-25' : ''
								}`}
								key={el.code}
								src={el.imgSrc}
								onClick={() => selectElement(el)}
							/>
						))}
					</div>
					<br />
					<WeaponTypeFilter
						selectedWeaponTypeCode={selectedWeaponTypeCode}
						onTypeCodeSelect={selectWeaponTypeCode}
						classes={'d-inline'}
					/>
				</div>
			</div>
			{rows.length === 0 ? 'not yet' : rows}
		</div>
	)
}
