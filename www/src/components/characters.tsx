import './characters.scss'

export function CharacterAvatar({
	src,
	rarity,
	classes = '',
	onClick,
}: {
	src: string
	rarity: 5 | 4
	classes?: string
	onClick: () => void
}): JSX.Element {
	let rarityClass = ''
	switch (rarity) {
		case 4:
			rarityClass = 'bg-primary'
			break
		case 5:
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

export function CharacterPortrait({ src, classes = '' }: { src: string; classes?: string }): JSX.Element {
	return <img className={`character-portrait ${classes}`} src={src} />
}
