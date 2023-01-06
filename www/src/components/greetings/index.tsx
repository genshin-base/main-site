import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'

import { useBuildWithDelayedLocs } from '#src/api'
import { BlockHeader } from '#src/components/block-header'
import { WeaponCard } from '#src/containers/item-cards/dd-cards'
import { LabeledItemAvatar } from '#src/containers/item-cards/item-avatars'
import {
	I18N_ARTIFACTS,
	I18N_BEST_CHAR_BUILDS,
	I18N_CONJUCTIONS,
	I18N_FOR_EXAMPLE,
	I18N_MORE_ON_BUILDS_PAGE,
	I18N_WEAPON_REFINE,
	I18N_WEAPON_STACKS_COUNT,
	I18N_WEAPONS,
} from '#src/i18n/i18n'
import {
	genArtifactAdvice,
	genNotes,
	genSeeCharNotes,
	ItemsJoinerWrap,
	ItemsListGroupWrap,
} from '#src/modules/builds/common'
import { A } from '#src/routes/router'
import { isLoaded, useVersionedStorage, useWindowSize, WindowSize } from '#src/utils/hooks'
import { SV_ARE_GREETINGS_VISIBLE } from '#src/utils/local-storage-keys'
import { getWeaponIconSrc } from '#src/utils/weapons'

import dmg0 from './img/dmg_0.webp'
import dmg1 from './img/dmg_1.webp'
import dmg2 from './img/dmg_2.webp'
import dmg3 from './img/dmg_3.webp'
import './greetings.scss'

const yaeCode = 'yae-miko'
const damages: string[] = [dmg0, dmg1, dmg2, dmg3]

function updateEl(
	coords: { x: number; y: number },
	windowSize: WindowSize,
	el: HTMLDivElement | HTMLImageElement,
	sensX: number,
	sensY?: number,
) {
	if (!el) return
	const gSens = 0.1
	el.style.transform = `translate(${(coords.x - (windowSize.width || 0) / 2) * sensX * gSens}px, ${
		(coords.y - (windowSize.height || 0) / 2) * (sensY === undefined ? sensX : sensY) * gSens
	}px)`
}

export function Greetings({
	classes = '',
	isClosable,
	isHiddenOnMobile,
}: {
	classes?: string
	isClosable: boolean
	isHiddenOnMobile?: boolean
}): JSX.Element | null {
	const [areGreetingsVisible, setAreGreetingsVisible] = useVersionedStorage(SV_ARE_GREETINGS_VISIBLE)
	const areCurrentlyVisible = areGreetingsVisible || !isClosable
	const hiddenOnMobileClass = isHiddenOnMobile ? 'd-none d-lg-block' : ''

	const wrapRef = useRef<HTMLDivElement>(null)
	const bgRef = useRef<HTMLDivElement>(null)
	const mikoRef = useRef<HTMLDivElement>(null)
	const damagesRef = useRef<HTMLImageElement[]>([])
	const windowSize = useWindowSize()
	const [mikoName, setMikoName] = useState<string | null>(null)

	const closeGreetings = useCallback(() => {
		setAreGreetingsVisible(false)
	}, [setAreGreetingsVisible])

	const openGreetings = useCallback(() => {
		setAreGreetingsVisible(true)
	}, [setAreGreetingsVisible])

	useEffect(() => {
		if (!areCurrentlyVisible) return
		function moveElems(e: MouseEvent) {
			if (!windowSize.width) return
			const coords = { x: e.clientX, y: e.clientY }
			if (bgRef.current) updateEl(coords, windowSize, bgRef.current, 0.1)
			if (mikoRef.current) updateEl(coords, windowSize, mikoRef.current, 0.3, 0)
			if (damagesRef.current)
				damagesRef.current.forEach((dr, i) => updateEl(coords, windowSize, dr, 0.3 + i * 0.3))
		}
		addEventListener('mousemove', moveElems, { passive: true })
		return () => {
			removeEventListener('mousemove', moveElems)
		}
	}, [windowSize, areCurrentlyVisible])

	useLayoutEffect(() => {
		if (wrapRef.current) wrapRef.current.style.height = wrapRef.current.offsetWidth / 2 + 'px'
	}, [wrapRef, windowSize, areCurrentlyVisible])

	/*
	если убрать ключи у элементов,
	то, после нажатия на крестик, во врап-реф и бг-реф попадут элементы омамори, 
	и им установятся ненужные свойства
	*/

	if (!areCurrentlyVisible)
		return (
			<div className={`greetings-omamori position-relative ${hiddenOnMobileClass}`} key="omamori">
				<div className="omamori-wrap position-absolute end-0 c-pointer" onClick={openGreetings}>
					<img src="https://i.imgur.com/VlUoqjo.png" />
				</div>
			</div>
		)
	return (
		<div
			className={`greetings w-100 position-relative rounded-1 ${classes} ${hiddenOnMobileClass}`}
			ref={wrapRef}
			key="greetings"
		>
			<div className="bg" ref={bgRef}></div>
			<div className="damages-wrap">
				{damages.map((d, i) => (
					<img
						className="damage-text"
						src={d}
						key={d}
						ref={el => (damagesRef.current[i] = el as HTMLImageElement)}
					/>
				))}
			</div>
			<div className="miko" ref={mikoRef}></div>
			<BuildInfo updateName={setMikoName} />
			<h2 className="position-relative fw-bolder fst-italic my-2 text-center">
				{I18N_BEST_CHAR_BUILDS}
			</h2>
			<h4 className="position-relative text-center">{I18N_FOR_EXAMPLE}</h4>
			<div className="build-owner position-absolute bottom-0 start-0 py-2 px-3 rounded-top not-rounded-start">
				<span className="fs-2">{mikoName}</span>
				<br />
				<A className="link-danger" href={`/builds/` + yaeCode}>
					{I18N_MORE_ON_BUILDS_PAGE}
				</A>
			</div>
			{isClosable && (
				<button
					type="button"
					class="btn-close btn-sm position-absolute end-0 top-0 m-3"
					aria-label="Close"
					onClick={closeGreetings}
				></button>
			)}
		</div>
	)
}

function BuildInfo({ updateName }: { updateName: (name: string) => void }): JSX.Element {
	const [build] = useBuildWithDelayedLocs(yaeCode)

	const weaponListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = build.character.roles[0]
		if (!role) return []
		return (
			<ol className="mb-0 pb-2">
				{role.weapons.advices.map((advice, i) => {
					const isInList = advice.similar.length > 1
					const map = advice.similar.map((item, i) => {
						const weapon = build.weapons.find(x => x.code === item.code)
						if (!weapon) return null
						const isLastInList = i >= advice.similar.length - 1
						return (
							<>
								<LabeledItemAvatar
									imgSrc={getWeaponIconSrc(weapon.code)}
									title={
										weapon.name +
										(item.refine === null
											? ''
											: ` [${I18N_WEAPON_REFINE(item.refine)}]`) +
										(item.stacks === null
											? ''
											: ` (${I18N_WEAPON_STACKS_COUNT(item.stacks)})`)
									}
									rarity={weapon.rarity}
									avatarClasses="with-padding"
									classes={`small ${!isInList || isLastInList ? 'mb-1' : ''}`}
									ddComponent={<WeaponCard weapon={weapon} related={build.maps} />}
								/>
								{genNotes(item)}
								{genSeeCharNotes(item)}
								{isInList && !isLastInList && (
									<ItemsJoinerWrap>{I18N_CONJUCTIONS.or}</ItemsJoinerWrap>
								)}
							</>
						)
					})
					return (
						<li key={i} className="pt-1">
							{isInList ? <ItemsListGroupWrap>{map}</ItemsListGroupWrap> : map}
						</li>
					)
				})}
			</ol>
		)
	}, [build])
	useEffect(() => {
		isLoaded(build) && updateName(build.character.name)
	}, [build, updateName])
	const artifactsListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = build.character.roles[0]
		if (!role) return []
		const listTimit = 10
		return (
			<ol className="mb-0 rounded-top not-rounded-end pb-2">
				{role.artifacts.sets.map((set, i) => {
					if (i > listTimit) return
					return (
						<li key={i} className="pt-2">
							{genArtifactAdvice(set.arts, build, false)}
						</li>
					)
				})}
				{role.artifacts.sets.length > listTimit ? (
					<li className="pt-2">
						<A className="link-secondary text-muted small" href={`/builds/` + yaeCode}>
							{I18N_MORE_ON_BUILDS_PAGE}
						</A>
					</li>
				) : null}
			</ol>
		)
	}, [build])

	return (
		<div className="build-info d-flex align-items-end">
			<div className="recs-wrap position-relative">
				<label className="arrow position-absolute start-50">
					<span>‹</span>
				</label>
				<BlockHeader classes="mt-3 mx-2 mb-1">{I18N_ARTIFACTS}</BlockHeader>
				{artifactsListBlock}
			</div>
			<div className="recs-wrap position-relative">
				<label className="arrow position-absolute start-50">
					<span>‹</span>
				</label>
				<BlockHeader classes="mt-3 mx-2 mb-1">{I18N_WEAPONS}</BlockHeader>
				{weaponListBlock}
			</div>
		</div>
	)
}
