import { useCallback, useState } from 'preact/hooks'
import { ItemAvatar } from './item-cards/item-cards'
import { getItemIconSrc } from '#src/utils/items'

const DEF_ICON = getItemIconSrc('philosophies-of-resistance')
export function AlchemyCalculator({
	classes = '',
	iconSrc = DEF_ICON,
}: {
	classes?: string
	iconSrc?: string
}): JSX.Element {
	const [values, setValues] = useState<number[]>([9, 3, 1])
	const onValueChange = useCallback(
		e => {
			const v = +e.target.value
			let values
			switch (+e.target.dataset.index) {
				case 0:
					values = [v, v / 3, v / 9]
					break
				case 1:
					values = [v * 3, v, v / 3]
					break
				case 2:
					values = [v * 9, v * 3, v]
					break
			}
			setValues(values.map(v => Math.round(v)))
		},
		[setValues],
	)
	return (
		<div className={`alchemy-calculator overflow-hidden ${classes}`}>
			<div className="input-group">
				<input
					type="number"
					min="0"
					className="form-control bg-dark text-light text-end pe-1"
					onInput={onValueChange}
					value={values[0]}
					data-index="0"
				/>
				<ItemAvatar
					src={iconSrc}
					rarity={3}
					classes="small-avatar with-padding input-group-avatar not-rounded-end not-rounded-start border-top border-bottom border-dark"
				/>
				<span className="input-group-text bg-3 ps-1">{'='}</span>
				<input
					type="number"
					min="0"
					className="form-control bg-dark text-light text-end pe-1"
					onInput={onValueChange}
					value={values[1]}
					data-index="1"
				/>
				<ItemAvatar
					src={iconSrc}
					rarity={4}
					classes="small-avatar with-padding input-group-avatar not-rounded-start not-rounded-end border-top border-bottom border-dark"
				/>
				<span className="input-group-text bg-4 ps-1">{'='}</span>
				<input
					type="number"
					min="0"
					className="form-control bg-dark text-light text-end pe-1"
					onInput={onValueChange}
					value={values[2]}
					data-index="2"
				/>
				<ItemAvatar
					src={iconSrc}
					rarity={5}
					classes="small-avatar with-padding input-group-avatar not-rounded-start rounded-end border-top border-bottom border-dark"
				/>
			</div>
		</div>
	)
}
