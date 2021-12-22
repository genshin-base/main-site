import { useCallback, useRef, useState } from 'preact/hooks'

import { GI_RarityCode } from '#lib/genshin'
import { ArtifactDetailDd } from './dd-cards'

import './item-cards.scss'

export function ItemAvatar({
	src,
	rarity,
	classes = '',
	hash = '',
}: {
	src: string
	rarity: GI_RarityCode
	classes?: string
	hash?: string
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
		<a href={hash}>
			<img className={`item-avatar rounded-circle ${rarityClass} ${classes}`} src={src} />
		</a>
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
	const elRef = useRef(null)
	const [isExpanded, setIsExpanded] = useState(false)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])
	//todo c-pointer для интерактивных
	return (
		<div className={`text-nowrap d-inline ${classes}`} ref={elRef} onClick={openDd}>
			<ItemAvatar rarity={rarity} classes="small" src={imgSrc} />
			<label className="text-wrap align-middle lh-1 ps-1 mw-75 text-decoration-dashed">{title}</label>
			{isExpanded ? <ArtifactDetailDd onClickAway={closeDd} targetEl={elRef.current} /> : null}
		</div>
	)
}
