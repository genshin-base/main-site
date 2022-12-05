import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks'

import { useBuildWithDelayedLocs } from '#src/api'
import { WeaponCard } from '#src/containers/item-cards/dd-cards'
import { LabeledItemAvatar } from '#src/containers/item-cards/item-avatars'
import {
	I18N_CONJUCTIONS,
	I18N_MORE_ON_BUILDS_PAGE,
	I18N_WEAPON_REFINE,
	I18N_WEAPON_STACKS_COUNT,
} from '#src/i18n/i18n'
import {
	genArtifactAdvice,
	genNotes,
	genSeeCharNotes,
	getRoleData,
	ItemsJoinerWrap,
	ItemsListGroupWrap,
} from '#src/modules/builds/common'
import { A } from '#src/routes/router'
import { isLoaded, useWindowSize, WindowSize } from '#src/utils/hooks'
import { getWeaponIconSrc } from '#src/utils/weapons'

import './greetings.scss'

const updateEl = function (
	coords: { x: number; y: number },
	windowSize: WindowSize,
	el: HTMLDivElement | HTMLImageElement,
	sensX: number,
	sensY?: number,
) {
	const gSens = 0.1
	el.style.transform = `translate(${(coords.x - (windowSize.width || 0) / 2) * sensX * gSens}px, ${
		(coords.y - (windowSize.height || 0) / 2) * (sensY === undefined ? sensX : sensY) * gSens
	}px)`
}

const damages: string[] = [
	'https://i.imgur.com/UiCDhKm.png',
	'https://i.imgur.com/jEdnYZz.png',
	'https://i.imgur.com/dAgppM3.png',
	'https://i.imgur.com/qglj5Eb.png',
]

export function Greetings({}): JSX.Element {
	const bgRef = useRef<HTMLDivElement>(null)
	const mikoRef = useRef<HTMLDivElement>(null)
	const damagesRef = useRef<HTMLImageElement[]>([])
	const windowSize = useWindowSize()

	const moveElems = useCallback(
		(e: any) => {
			if (!windowSize.width) return
			const coords = { x: e.clientX, y: e.clientY }
			if (bgRef.current) updateEl(coords, windowSize, bgRef.current, 0.1)
			if (mikoRef.current) updateEl(coords, windowSize, mikoRef.current, 0.3, 0)
			if (damagesRef.current)
				damagesRef.current.forEach((dr, i) => updateEl(coords, windowSize, dr, 0.3 + i * 0.3))
		},
		[windowSize],
	)
	useEffect(() => {
		addEventListener('mousemove', moveElems, true)
		return () => {
			removeEventListener('mousemove', moveElems)
		}
	}, [moveElems])
	return (
		<div className="greetings w-100 position-relative rounded-1 mb-2">
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
			<BuildInfo />
			<h2 className="position-relative fw-bolder fst-italic text-center">
				Best builds for Genshin characters
			</h2>
			<h4 className="position-relative text-center">For example…</h4>
		</div>
	)
}
const yaeCode = 'yae-miko'
function BuildInfo(): JSX.Element {
	const [build, isUpdating] = useBuildWithDelayedLocs(yaeCode)

	const weaponListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = build.character.roles[0]
		if (!role) return []
		return (
			<ol className="mb-0 rounded-top not-rounded-end py-2">
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

	const artifactsListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = build.character.roles[0]
		if (!role) return []
		const listTimit = 10
		return (
			<ol className="mb-0 rounded-top not-rounded-end py-2">
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
			{artifactsListBlock}
			{weaponListBlock}
		</div>
	)
}
