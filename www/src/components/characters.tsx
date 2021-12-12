import './characters.scss'

export function CharacterAvatar({
	src,
	rarity,
	classes = '',
	onClick,
}: {
	src: string
	rarity: '5-star' | '4-star'
	classes?: string
	onClick: () => void
}): JSX.Element {
	let rarityClass = ''
	switch (rarity) {
		case '4-star':
			rarityClass = 'bg-primary'
			break
		case '5-star':
			rarityClass = 'bg-warning'
			break
	}
	return (
		<img
			onClick={onClick}
			className={`character-avatar rounded-circle ${rarityClass} ${classes}`}
			src={src}
		/>
	)
}
