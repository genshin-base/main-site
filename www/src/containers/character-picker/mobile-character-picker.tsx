import { useMemo, useState } from 'preact/hooks'

import { GI_ElementCode, GI_WeaponTypeCode } from '#lib/genshin'
import { charactersShortList } from '#src/api/generated'
import { ItemAvatar } from '#src/containers/item-cards/item-avatars'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { elements } from '#src/utils/elements'
import { weaponTypes } from '#src/utils/weapons'

export function CharacterPickerMobile() {
	const [selectedElementCode, setSelectedElementCode] = useState<null | GI_ElementCode>(null)
	const selectElement = el => setSelectedElementCode(selectedElementCode === el.code ? null : el.code)
	const [selectedWeaponTypeCode, setSelectedWeaponTypeCode] = useState<null | GI_WeaponTypeCode>(null)

	const selectWeaponType = wp =>
		setSelectedWeaponTypeCode(selectedWeaponTypeCode === wp.code ? null : wp.code)

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
		<div className="row" key={element.code}>
			<div className="col-2 py-1">
				<img className="rounded-circle d-block mx-auto opacity-50 muted-icon" src={element.imgSrc} />
			</div>
			<div className="col py-31">
				{characters.map(x => (
					<ItemAvatar
						src={getCharacterAvatarSrc(x.code)}
						// rarity={x.rarity}
						href={'/builds/' + x.code}
						classes={`m-1 border ${x.rarity === 5 ? 'border-warning' : 'border-light'}`}
					/>
				))}
			</div>
		</div>
	))

	return (
		<div className="character-picker-mobile">
			<div className="m-auto text-center my-3">
				<div className="m-auto">Filter </div>
				<div className="d-inline">
					<div className="d-inline">
						{elements.map(el => (
							<img
								className={`character-avatar small-avatar rounded-circle bg-secondary p-1 m-1 ${
									selectedElementCode && selectedElementCode !== el.code ? 'opacity-25' : ''
								}`}
								key={el.code}
								src={el.imgSrc}
								onClick={() => selectElement(el)} //todo почему без стрелки тайпскрипт не пускает?
							/>
						))}
					</div>
					<br />
					<div className="d-inline">
						{weaponTypes.map(wt => (
							<img
								className={`character-avatar small-avatar rounded-circle bg-secondary p-1 m-1 ${
									selectedWeaponTypeCode && selectedWeaponTypeCode !== wt.code
										? 'opacity-25'
										: ''
								}`}
								key={wt.code}
								src={wt.imgSrc}
								onClick={() => selectWeaponType(wt)} //todo почему без стрелки тайпскрипт не пускает?
							/>
						))}
					</div>
				</div>
			</div>
			{rows.length === 0 ? 'not yet' : rows}
		</div>
	)
}
