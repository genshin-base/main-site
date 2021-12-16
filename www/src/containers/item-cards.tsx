import { GI_RarityCode } from 'src/../../lib/genshin'

import './item-cards.scss'

export function ItemAvatar({
	src,
	rarity,
	classes = '',
	onClick,
}: {
	src: string
	rarity: GI_RarityCode
	classes?: string
	onClick?: () => void
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
		<img
			onClick={onClick}
			className={`item-avatar rounded-circle ${onClick ? 'clickable' : ''} ${rarityClass} ${classes}`}
			src={src}
		/>
	)
}

export function LabeledItemAvatar({
	imgSrc,
	rarity,
	classes = '',
	title,
}: {
	imgSrc: string
	rarity: GI_RarityCode
	title: string
	classes?: string
}): JSX.Element {
	return (
		<div className={`text-nowrap ${classes}`}>
			<ItemAvatar rarity={rarity} classes="small" src={imgSrc} />
			<label className="text-wrap align-middle lh-1 ps-1 w-75">{title}</label>
		</div>
	)
}
