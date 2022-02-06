import { useCallback, useEffect, useState } from 'preact/hooks'
import { ItemAvatar } from './item-cards/item-avatars'
import { getItemIconSrc } from '#src/utils/items'
import { GI_RarityCode } from '#src/../../lib/genshin'

const DEF_ANCESTRY_CODES = [
	'agnidus-agate-sliver',
	'agnidus-agate-fragment',
	'agnidus-agate-chunk',
	'agnidus-agate-gemstone',
]
export function AlchemyCalculator({
	classes = '',
	ancestryCodes = DEF_ANCESTRY_CODES,
}: {
	classes?: string
	ancestryCodes?: string[]
}): JSX.Element {
	const [values, setValues] = useState<number[]>([])
	const onValueChange = useCallback(
		e => {
			const value = +e.target.value
			const index = +e.target.dataset.index
			setValues(values.map((v, i) => (v = Math.floor(3 ** (index - i) * value))))
		},
		[setValues, values],
	)
	useEffect(() => {
		setValues(ancestryCodes.map((c, i) => 3 ** (ancestryCodes.length - 1 - i)))
	}, [ancestryCodes])
	const startNotRoundClass = 'not-rounded-start'
	const endNotRoundClass = 'not-rounded-end'
	const endRoundClass = 'rounded-end'
	return (
		<div className={`alchemy-calculator overflow-hidden ${classes}`}>
			<div className="input-group">
				{ancestryCodes.map((c, i) => {
					const isFirst = i === 0
					const isLast = i === ancestryCodes.length - 1
					const rarity = 5 - (ancestryCodes.length - 1 - i)
					return (
						<>
							{i !== 0 ? (
								<span className={`input-group-text bg-${rarity - 1} ps-1`}>{'='}</span>
							) : null}
							<input
								type="number"
								min="0"
								className={`form-control bg-dark text-light text-end pe-1 ${
									!isFirst ? startNotRoundClass : ''
								} ${endNotRoundClass}`}
								onInput={onValueChange}
								value={values[i]}
								data-index={i}
							/>
							<ItemAvatar
								src={getItemIconSrc(c)}
								rarity={rarity as GI_RarityCode}
								classes={`small-avatar with-padding input-group-avatar ${startNotRoundClass} ${
									!isLast ? endNotRoundClass : endRoundClass
								} border-top border-bottom border-dark`}
							/>
						</>
					)
				})}
			</div>
		</div>
	)
}
