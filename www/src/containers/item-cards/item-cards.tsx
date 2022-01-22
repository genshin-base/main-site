import { useCallback, useRef, useState } from 'preact/hooks'

import { GI_RarityCode } from '#lib/genshin'

import './item-cards.scss'

interface DdComponentProps<TItem, TRelated> {
	onClickAway(): unknown
	targetEl: HTMLElement
	items: TItem[]
	related: TRelated
	title: string
}
interface DDProps<TItem, TRelated> {
	ddItems?: TItem[]
	related?: TRelated
	DdComponent?: preact.ComponentType<DdComponentProps<TItem, TRelated>>
}
export function ItemAvatar<TItem, TRelated>({
	src,
	rarity,
	classes = '',
	hash,
	onClick,
	badge,
	ddProps,
}: {
	src: string
	rarity?: GI_RarityCode
	classes?: string
	hash?: string
	onClick?(): unknown
	badge?: string
	ddProps?: DDProps<TItem, TRelated>
}): JSX.Element {
	;['bg-2', 'bg-3', 'bg-4', 'bg-5']
	const rarityClass = rarity ? 'bg-' + rarity : 'bg-dark'

	const elRef = useRef<HTMLAnchorElement>(null)
	const [isExpanded, setIsExpanded] = useState(false)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])
	const DdComponent = ddProps?.DdComponent,
		ddItems = ddProps?.ddItems,
		related = ddProps?.related
	const pointerClass = DdComponent || onClick ? 'c-pointer' : ''
	const onClickLocal = useCallback(() => {
		openDd && openDd()
		onClick && onClick()
	}, [openDd, onClick])
	return (
		<a
			href={hash}
			className={`item-avatar position-relative small rounded-circle d-inline-block overflow-hidden ${pointerClass} ${rarityClass} ${classes}`}
			ref={elRef}
			onClick={onClickLocal}
		>
			<img className="image" src={src} />

			{badge && (
				<span className="position-absolute top-0 start-0 translate-middle badge rounded-pill opacity-75 small">
					{badge}
				</span>
			)}
			{/* <span className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-primary border border-light">
				4
			</span> */}
			{isExpanded && elRef.current && DdComponent && ddItems?.length && related && (
				<DdComponent
					onClickAway={closeDd}
					targetEl={elRef.current}
					items={ddItems}
					related={related}
					title={''}
				/>
			)}
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

export function LabeledItemAvatar<TItem, TRelated>({
	imgSrc,
	rarity,
	classes = '',
	avatarClasses = '',
	title,
	avatarBadge,
	ddProps,
}: {
	imgSrc: string
	rarity?: GI_RarityCode
	title: string
	classes?: string
	avatarClasses?: string
	avatarBadge?: string
	ddProps?: DDProps<TItem, TRelated>
}): JSX.Element {
	const elRef = useRef<HTMLDivElement>(null)
	const [isExpanded, setIsExpanded] = useState(false)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])
	//todo c-pointer для интерактивных
	const DdComponent = ddProps?.DdComponent,
		ddItems = ddProps?.ddItems,
		related = ddProps?.related
	const pointerClass = DdComponent ? 'c-pointer' : ''
	return (
		<div className={`text-nowrap ${pointerClass} ${classes}`} ref={elRef} onClick={openDd}>
			<ItemAvatar
				classes={`small-avatar align-middle ${avatarClasses}`}
				src={imgSrc}
				badge={avatarBadge}
			/>
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
