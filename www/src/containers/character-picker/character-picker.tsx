import { ItemAvatar } from '#src/containers/item-cards/item-cards'
import { charactersShortList } from '#src/generated'
import { makeCharacterBuildHash } from '#src/hashstore'
import { getCharacterAvatarSrc } from '#src/utils/characters'
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
							<img className="rounded-circle d-block mx-auto" src={el.imgSrc} />
						</div>
						{weaponTypes.map(wType => (
							<div className={`col col-2 pt-3 pb-2 ${isLastRowClass}`} key={wType.code}>
								{charactersShortList
									.filter(x => x.elementCode === el.code && x.weaponTypeCode === wType.code)
									.map(x => (
										<ItemAvatar
											key={x.code}
											src={getCharacterAvatarSrc(x.code)}
											rarity={x.rarity}
											hash={makeCharacterBuildHash(x.code)}
											classes="mb-1 me-1 mb-xxl-2 me-xxl-2"
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
							<img className="rounded-circle d-block mx-auto" src={wt.imgSrc} />
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
