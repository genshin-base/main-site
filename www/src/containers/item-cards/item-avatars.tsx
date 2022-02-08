import { useCallback, useRef, useState } from 'preact/hooks'

import { GI_RarityCode } from '#lib/genshin'
import { A } from '#src/routes/router'

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
	href,
	onClick,
	badgeTopStart,
	badgeTopEnd,
	ddProps,
}: {
	src: string
	rarity?: GI_RarityCode
	classes?: string
	href?: string
	onClick?(): unknown
	badgeTopStart?: string | null | JSX.Node
	badgeTopEnd?: string | null | JSX.Node
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
		<A
			href={href}
			className={`item-avatar position-relative rounded-circle d-inline-block ${pointerClass} ${rarityClass} ${classes}`}
			ref={elRef}
			onClick={onClickLocal}
		>
			<img className="image" src={src} />
			{badgeTopStart && (
				<span className="position-absolute top-0 start-0 translate-middle badge rounded-pill opacity-75 small">
					{badgeTopStart}
				</span>
			)}
			{badgeTopEnd && (
				<span className="position-absolute top-0 start-100 translate-middle badge rounded-pill opacity-75 small">
					{badgeTopEnd}
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
		</A>
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
	avatarTopStartBadge,
	avatarTopEndBadge,
	ddProps,
}: {
	imgSrc: string
	rarity?: GI_RarityCode
	title: string
	classes?: string
	avatarClasses?: string
	avatarTopStartBadge?: string
	avatarTopEndBadge?: string
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
				badgeTopStart={avatarTopStartBadge}
				badgeTopEnd={avatarTopEndBadge}
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
