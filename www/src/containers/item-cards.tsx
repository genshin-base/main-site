import './item-cards.scss'

export function LabeledItemAvatar({
	imgSrc,
	rarity,
	classes = '',
	title,
}: {
	imgSrc: string
	rarity: 5 | 4 | 3
	title: string
	classes?: string
}): JSX.Element {
	let rarityClass = ''
	switch (rarity) {
		case 5:
			rarityClass = 'bg-warning'
			break
		case 4:
			rarityClass = 'bg-primary'
			break
		case 3:
			rarityClass = 'bg-dark'
			break
	}
	return (
		<div className={`text-nowrap classes`}>
			<img className={`item-avatar rounded-circle ${rarityClass} ${classes}`} src={imgSrc} />
			<label className="text-wrap align-middle lh-1">{title}</label>
		</div>
	)
}
