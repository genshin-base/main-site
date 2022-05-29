import { charactersShortList } from '#src/api/generated'
import { CharacterAvatar, ItemAvatar } from '#src/containers/item-cards/item-avatars'
import { elements } from '#src/utils/elements'
import { GI_WeaponType, weaponTypes } from '#src/utils/weapons'
import { CharacterPickerMobile } from './mobile-character-picker'

import './character-picker.scss'

function CharacterPickerDesktop({ weaponTypes }: { weaponTypes: GI_WeaponType[] }) {
	return (
		<>
			{elements.map((el, i, arr) => {
				const isLastRowClass = i + 1 === arr.length ? 'rounded-bottom' : ''
				return (
					<div className="row" key={el.code}>
						<div className="col col-2 pt-3 pb-2 opacity-50 rounded-start">
							<ItemAvatar classes="d-block mx-auto" isNoBg={true} src={el.imgSrc} />
						</div>
						{weaponTypes.map(wType => (
							<div className={`col col-2 pt-3 pb-2 px-2 ${isLastRowClass}`} key={wType.code}>
								{charactersShortList
									.filter(x => x.elementCode === el.code && x.weaponTypeCode === wType.code)
									.map(x => (
										<CharacterAvatar
											key={x.code}
											code={x.code}
											rarity={x.rarity}
											href={'/builds/' + x.code}
											classes={`mb-1 me-1 mb-xxl-2 me-xxl-2`}
										/>
									))}
							</div>
						))}
					</div>
				)
			})}
		</>
	)
}

export function CharacterPicker() {
	return (
		<div className="character-picker">
			<div class="d-none d-xl-block container overflow-hidden big-table">
				<div className="row">
					<div className="col col-2 pb-3 pt-2"></div>
					{weaponTypes.map((wt, i) => (
						<div className="col col-2 pb-3 pt-2 rounded-top " key={wt.code}>
							<ItemAvatar classes="d-block mx-auto" isNoBg={true} src={wt.imgSrc} />
						</div>
					))}
				</div>
				<CharacterPickerDesktop weaponTypes={weaponTypes} />
			</div>
			<div class="d-xl-none">
				<CharacterPickerMobile />
			</div>
		</div>
	)
}
