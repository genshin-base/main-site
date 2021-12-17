import { isLoaded, useFetch } from 'src/api/hooks'
import { apiGetCharacterFullInfo, charactersShortList } from 'src/generated'
import { weaponTypes } from 'src/utils/weapon-types'
import character_Amber_Thumb from '../../media/Character_Amber_Thumb.png' // todo remove
import { elements } from '../../utils/elements'
import { ItemAvatar } from '../item-cards/item-cards'
import { CharacterPickerMobile } from './mobile-character-picker'

import './character-picker.scss'

// todo remove
const doNothing = () => {
	0 === 0
}
const ThreeAmbers = () => (
	<>
		{[1, 2, 3].map(() => (
			<ItemAvatar
				src={character_Amber_Thumb}
				rarity={5}
				onClick={doNothing}
				classes="mb-1 me-1 mb-xxl-2 me-xxl-2"
			/>
		))}
	</>
)
const FiveAmbers = () => (
	<>
		{[1, 2, 3, 4, 5].map(() => (
			<ItemAvatar
				src={character_Amber_Thumb}
				rarity={4}
				onClick={doNothing}
				classes="mb-1 me-1 mb-xxl-2 me-xxl-2"
			/>
		))}
	</>
)
// end todo remove

const desctopRows = elements.map((el, i, arr) => {
	const isLastRowClass = i + 1 === arr.length ? 'rounded-bottom' : ''
	return (
		<div className="row" key={el.code}>
			<div className="col col-2 pt-3 pb-2 opacity-50 rounded-start">
				<img className="rounded-circle d-block mx-auto" src={el.imgSrc} />
			</div>
			<div className={`col col-2 pt-3 pb-2 ${isLastRowClass}`}>
				<ThreeAmbers />
			</div>
			<div className="col col-2 pt-3 pb-2">
				<FiveAmbers />
			</div>
			<div className={`col col-2 pt-3 pb-2 ${isLastRowClass}`}>
				<ThreeAmbers />
			</div>
			<div className="col col-2 pt-3 pb-2">
				<ThreeAmbers />
			</div>
			<div className={`col col-2 pt-3 pb-2 ${isLastRowClass}`}>
				<ThreeAmbers />
			</div>
		</div>
	)
})

export function CharacterPicker() {
	const amber = useFetch(sig => apiGetCharacterFullInfo('amber', sig), [])
	if (isLoaded(amber)) console.log(amber.character.code, amber)

	console.log(
		'characters list',
		charactersShortList.map(x => x.code + ':' + x.elementCode),
	)

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
				{desctopRows}
			</div>
			<div class="d-xl-none">
				<CharacterPickerMobile onCharacterSelect={doNothing} />
			</div>
		</div>
	)
}
