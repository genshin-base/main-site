import { useCallback, useRef, useState } from 'preact/hooks'

import { GI_RarityCode } from '#lib/genshin'
import { A } from '#src/routes/router'

import './item-cards.scss'
import { createContext } from 'preact'
import { CardDescMobileWrap } from './dd-cards'

export function ItemAvatar({
	src,
	rarity,
	classes = '',
	href,
	onClick,
	badgeTopStart,
	badgeTopEnd,
	ddComponent,
}: {
	src: string
	rarity?: GI_RarityCode
	classes?: string
	href?: string
	onClick?(): unknown
	badgeTopStart?: string | null | JSX.Node
	badgeTopEnd?: string | null | JSX.Node
	ddComponent?: JSX.Element
}): JSX.Element {
	;['bg-2', 'bg-3', 'bg-4', 'bg-5']
	const rarityClass = rarity ? 'bg-' + rarity : 'bg-dark'

	const elRef = useRef<HTMLAnchorElement>(null)
	const [isExpanded, setIsExpanded] = useState(false)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])
	const pointerClass = ddComponent || onClick ? 'c-pointer' : ''
	const onClickLocal = useCallback(() => {
		openDd && openDd()
		onClick && onClick()
	}, [openDd, onClick])
	return (
		<DdContext.Provider value={{ onClickAway: closeDd }}>
			<A
				href={href}
				className={`item-avatar position-relative rounded-circle d-inline-block ${pointerClass} ${rarityClass} ${classes}`}
				innerRef={elRef}
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
				{isExpanded && elRef.current && ddComponent && (
					<CardDescMobileWrap onClickAway={closeDd} targetEl={elRef.current}>
						{ddComponent}
					</CardDescMobileWrap>
				)}
			</A>
		</DdContext.Provider>
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
export const DdContext = createContext({
	onClickAway: () => {
		return
	},
})
export function LabeledItemAvatar({
	imgSrc,
	rarity,
	classes = '',
	avatarClasses = '',
	title,
	avatarTopStartBadge,
	avatarTopEndBadge,
	ddComponent,
}: {
	imgSrc: string
	rarity?: GI_RarityCode
	title: string
	classes?: string
	avatarClasses?: string
	avatarTopStartBadge?: string
	avatarTopEndBadge?: string
	ddComponent?: JSX.Element
}): JSX.Element {
	const elRef = useRef<HTMLDivElement>(null)
	const [isExpanded, setIsExpanded] = useState(false)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])
	const pointerClass = ddComponent ? 'c-pointer' : ''
	return (
		<DdContext.Provider value={{ onClickAway: closeDd }}>
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
				{isExpanded && elRef.current && ddComponent && (
					<CardDescMobileWrap onClickAway={closeDd} targetEl={elRef.current}>
						{ddComponent}
					</CardDescMobileWrap>
				)}
			</div>
		</DdContext.Provider>
	)
}
