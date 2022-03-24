import { createContext } from 'preact'
import { useCallback, useContext, useRef, useState } from 'preact/hooks'

import { ART_GROUP_DETAILS, GI_RarityCode } from '#lib/genshin'
import {
	ArtifactFullInfo,
	DomainShortInfo,
	EnemyShortInfo,
	ItemShortInfo,
	WeaponFullInfo,
} from '#lib/parsing/combine'
import { mustBeNever } from '#src/../../lib/utils/values'
import { A } from '#src/routes/router'
import { getAllArtifacts } from '#src/utils/artifacts'
import { ArtifactCard, CardDescMobileWrap, WeaponCard } from './dd-cards'

import './item-cards.scss'
import { elements } from '#src/utils/elements'
import { getCharacterAvatarSrc } from '#src/utils/characters'

export function getRarityBorder(r: GI_RarityCode): string {
	return r === 5 ? 'border-warning' : 'border-light'
}

interface ItemAvatarCommonProps {
	rarity?: GI_RarityCode
	isNoBg?: boolean
	classes?: string
	href?: string
	onClick?(): unknown
	badgeTopStart?: string | null | JSX.Node
	badgeTopEnd?: string | null | JSX.Node
	ddComponent?: JSX.Element
}
interface ItemAvatarProps extends ItemAvatarCommonProps {
	src: string
}
interface CharacterAvatarProps extends ItemAvatarCommonProps {
	code: string //todo charcode
}
export function ItemAvatar({
	src,
	rarity,
	classes = '',
	href,
	isNoBg,
	onClick,
	badgeTopStart,
	badgeTopEnd,
	ddComponent,
}: ItemAvatarProps): JSX.Element {
	;['bg-2', 'bg-3', 'bg-4', 'bg-5']
	const rarityClass = isNoBg ? '' : rarity ? 'bg-' + rarity : 'bg-dark'

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
const codeToBadge = (code: string) => {
	const e = elements.find(e => code === `traveler-${e.code}`)
	return e ? <img className="badge-element-icon d-block ms-n1 mb-n1" src={e.imgSrc} /> : null
}
export function CharacterAvatar(props: CharacterAvatarProps) {
	const classesLocal = props.rarity
		? `${props.classes} border ${getRarityBorder(props.rarity)}`
		: props.classes
	return (
		<ItemAvatar
			{...props}
			rarity={undefined} //обработкой рарности персонажа занимается этот компонент, а не итемаватар
			classes={classesLocal}
			src={getCharacterAvatarSrc(props.code)}
			badgeTopEnd={codeToBadge(props.code)}
		/>
	)
}
function ItemLabel({
	rarity,
	classes = '',
	children,
}: {
	rarity?: GI_RarityCode | null
	classes?: string
	children: JSX.Nodes
}): JSX.Element {
	const rarityClass =
		rarity === 5 //
			? 'text-warning'
			: rarity === 4
			? 'text-primary'
			: ''
	//todo c-pointer text-decoration-underline-dotted для интерактивных
	return <label class={`${classes} ${rarityClass}`}>{children}</label>
}

function ItemDd({
	classes = '',
	children,
	ddComponent,
}: {
	classes?: string
	ddComponent?: JSX.Element | null
	children: JSX.Nodes
}): JSX.Element {
	const elRef = useRef<HTMLButtonElement>(null)
	const [isExpanded, setIsExpanded] = useState(false)

	const closeDd = useCallback(() => setIsExpanded(false), [])
	const openDd = useCallback(() => setIsExpanded(true), [])

	const pointerClass = ddComponent ? 'c-pointer' : ''
	return (
		<DdContext.Provider value={{ onClickAway: closeDd }}>
			<button
				className={`btn-reset ${pointerClass} ${classes}`}
				ref={elRef}
				onClick={openDd}
				disabled={!ddComponent}
			>
				{children}
				{isExpanded && elRef.current && ddComponent && (
					<CardDescMobileWrap onClickAway={closeDd} targetEl={elRef.current}>
						{ddComponent}
					</CardDescMobileWrap>
				)}
			</button>
		</DdContext.Provider>
	)
}

export const ItemsDataContext = createContext({
	weapons: new Map<string, WeaponFullInfo>(),
	artifacts: new Map<string, ArtifactFullInfo>(),
	domains: new Map<string, DomainShortInfo>(),
	enemies: new Map<string, EnemyShortInfo>(),
	items: new Map<string, ItemShortInfo>(),
})

export function ItemDetailsLabel({
	classes = '',
	type,
	code,
	children,
}: {
	classes?: string
	type: 'weapon' | 'artifact'
	code: string
	children: JSX.Nodes
}): JSX.Element {
	const maps = useContext(ItemsDataContext)

	let ddComp: JSX.Element | undefined = undefined
	let rarity: GI_RarityCode | undefined = undefined
	if (type === 'weapon') {
		const weapon = maps.weapons.get(code)
		if (weapon) {
			ddComp = <WeaponCard weapon={weapon} related={maps} />
			rarity = weapon.rarity
		}
	} else if (type === 'artifact') {
		const artifacts = getAllArtifacts(code, maps.artifacts)
		if (artifacts.length > 0) {
			const details = ART_GROUP_DETAILS[code] ?? artifacts[0]
			ddComp = <ArtifactCard title={details.name} artifacts={artifacts} related={maps} />
			rarity = artifacts[0].rarity
		}
	} else mustBeNever(type)

	const interactiveLabelClass = ddComp ? 'text-decoration-underline-dotted' : ''
	return (
		<ItemDd ddComponent={ddComp} classes={`d-inline ${classes}`}>
			<ItemLabel classes={`${interactiveLabelClass} c-inherit`} rarity={rarity}>
				{children}
			</ItemLabel>
		</ItemDd>
	)
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
	isNoBg = false,
}: {
	isNoBg?: boolean
	imgSrc: string
	rarity?: GI_RarityCode
	title: string
	classes?: string
	avatarClasses?: string
	avatarTopStartBadge?: string
	avatarTopEndBadge?: string
	ddComponent?: JSX.Element
}): JSX.Element {
	const interactiveLabelClass = ddComponent ? 'text-decoration-underline-dotted' : ''
	return (
		<ItemDd ddComponent={ddComponent} classes={`w-100 text-nowrap ${classes}`}>
			<ItemAvatar
				classes={`small-avatar align-middle ${avatarClasses}`}
				src={imgSrc}
				badgeTopStart={avatarTopStartBadge}
				badgeTopEnd={avatarTopEndBadge}
				isNoBg={isNoBg}
			/>
			<ItemLabel
				classes={'text-wrap align-middle lh-1 ps-1 mw-75 c-inherit ' + interactiveLabelClass}
				rarity={rarity}
			>
				{title}
			</ItemLabel>
		</ItemDd>
	)
}
