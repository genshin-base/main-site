import { useCallback } from 'preact/hooks'

export type Option = { title: string | JSX.Element; code: string }

export function SimpleSelect({
	options,
	selectedOption,
	onOptionSelect,
	classes = '',
	size = 1,
}: {
	options: Option[]
	selectedOption: Option | null
	onOptionSelect(Option): unknown
	classes?: string
	size?: number
}): JSX.Element {
	const handleChange = useCallback(
		e => {
			onOptionSelect(options.find(o => o.code === e.target.value))
		},
		[options, onOptionSelect],
	)
	return (
		<select
			className={`form-select bg-dark text-light c-pointer ${classes}`}
			onChange={handleChange}
			size={size}
		>
			<option value="" disabled selected hidden>
				Select…
			</option>
			{options.map(o => (
				<option
					className="c-pointer"
					key={o.code}
					value={o.code}
					selected={!!(selectedOption && o.code === selectedOption.code)}
				>
					{o.title}
				</option>
			))}
		</select>
	)
}
