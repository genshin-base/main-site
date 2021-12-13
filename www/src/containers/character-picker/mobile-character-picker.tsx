import { useState } from 'preact/hooks'

import { CharacterAvatar } from 'src/components/characters'
import character_Amber_Thumb from 'src/media/Character_Amber_Thumb.png' // todo remove
import { elements } from 'src/utils/elements'
import { weaponTypes } from 'src/utils/weaponTypes'

import type { GI_ElementCode } from 'lib/genshin'
import type { GI_WeaponTypeCode } from 'lib/genshin'

// todo remove
const doNothing = () => {
	0 === 0
}
const FiveAmbers = () => (
	<>
		{[1, 2, 3, 4, 5].map(() => (
			<CharacterAvatar src={character_Amber_Thumb} rarity={4} onClick={doNothing} classes="m-1" />
		))}
	</>
)
// end todo remove
export function CharacterPickerMobile({ onCharacterSelect }: { onCharacterSelect: (any) => void }) {
	const [selectedElementCode, setSelectedElementCode] = useState<null | GI_ElementCode>(null)
	const selectElement = el => setSelectedElementCode(selectedElementCode === el.code ? null : el.code)
	const [selectedWeaponTypeCode, setSelectedWeaponTypeCode] = useState<null | GI_WeaponTypeCode>(null)

	const selectWeaponType = wp =>
		setSelectedWeaponTypeCode(selectedWeaponTypeCode === wp.code ? null : wp.code)
	const filteredElements = elements.filter(el =>
		selectedElementCode ? el.code === selectedElementCode : true,
	)
	const rows = filteredElements.map(el => (
		<div className="row" key={el.code}>
			<div className="col-2 py-1 opacity-50">
				<img className="rounded-circle d-block mx-auto" src={el.imgSrc} />
			</div>
			<div className="col py-31">
				<FiveAmbers />
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
								className={`character-avatar small rounded-circle bg-secondary p-1 m-1 ${
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
								className={`character-avatar small rounded-circle bg-secondary p-1 m-1 ${
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
			{rows}
		</div>
	)
}
