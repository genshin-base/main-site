import './character-picker.scss'

import { elements } from '../../utils/elements'
import { useFetchTODO } from 'src/api/hooks'
import { isLoaded } from 'src/api/hooks'
import Spinner from 'src/components/spinners'

import character_Amber_Thumb from '../../media/Character_Amber_Thumb.png' // todo remove
import { CharacterAvatar } from 'src/components/characters'
import { CharacterPickerMobile } from './mobile-character-picker'
import { weaponTypes } from 'src/utils/weaponTypes'

// todo remove
const doNothing = () => {
	0 === 0
}
const ThreeAmbers = () => (
	<>
		{[1, 2, 3].map(() => (
			<CharacterAvatar
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
			<CharacterAvatar
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
const fetchTODO = () => new Promise(res => setTimeout(res, 1000))

export function CharacterPicker() {
	const characters = useFetchTODO(fetchTODO, [])
	if (!isLoaded(characters)) return <Spinner />
	const dc = []
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
