import { useCallback, useRef, useState } from 'preact/hooks'

import { GI_RarityCode } from '#lib/genshin'

import './item-cards.scss'

export function ItemAvatar({
	src,
	rarity,
	classes = '',
	hash,
	badge,
}: {
	src: string
	rarity?: GI_RarityCode
	classes?: string
	hash?: string
	badge?: string
}): JSX.Element {
	;['bg-2', 'bg-3', 'bg-4', 'bg-5']
	const rarityClass = rarity ? 'bg-' + rarity : 'bg-dark'
	return (
		<a href={hash} className="position-relative small">
			<img className={`item-avatar rounded-circle ${rarityClass} ${classes}`} src={src} />
			{badge && (
				<span className="position-absolute top-0 start-0 translate-middle badge rounded-pill opacity-75">
					{badge}
				</span>
			)}
			{/* <span className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-primary border border-light">
				4
			</span> */}
		</a>
	)
}
export function ItemLabelText({
	rarity,
	classes = '',
	title,
}: {
	rarity?: GI_RarityCode
	title: string
	classes?: string
}): JSX.Element {
	let rarityClass = ''
	switch (rarity) {
		case 5:
			rarityClass = 'text-warning'
			break
		case 4:
			rarityClass = 'text-primary'
			break
		default:
			rarityClass = ''
			break
	}
	//todo c-pointer text-decoration-underline-dotted для интерактивных
	return <label className={`${classes} ${rarityClass}`}>{title}</label>
}
interface DdComponentProps<TItem, TRelated> {
	onClickAway(): unknown
	targetEl: HTMLElement
	items: TItem[]
	related: TRelated
	title: string
}
export function LabeledItemAvatar<TItem, TRelated>({
	imgSrc,
	rarity,
	classes = '',
	title,
	avatarBadge,
	ddItems,
	related,
	DdComponent,
}: {
	imgSrc: string
	rarity?: GI_RarityCode
	title: string
	classes?: string
	avatarBadge?: string
	ddItems?: TItem[]
	related?: TRelated
	DdComponent?: preact.ComponentType<DdComponentProps<TItem, TRelated>>
}): JSX.Element {
	const elRef = useRef<HTMLDivElement>(null)
	const [isExpanded, setIsExpanded] = useState(false)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])
	//todo c-pointer для интерактивных
	const pointerClass = DdComponent ? 'c-pointer' : ''
	return (
		<div className={`text-nowrap ${pointerClass} ${classes}`} ref={elRef} onClick={openDd}>
			<ItemAvatar classes="small-avatar" src={imgSrc} badge={avatarBadge} />
			<ItemLabelText
				rarity={rarity}
				classes={`text-wrap align-middle lh-1 ps-1 mw-75 ${pointerClass}`}
				title={title}
			></ItemLabelText>
			{isExpanded && elRef.current && DdComponent && ddItems?.length && related && (
				<DdComponent
					onClickAway={closeDd}
					targetEl={elRef.current}
					items={ddItems}
					related={related}
					title={title}
				/>
			)}
		</div>
	)
}
