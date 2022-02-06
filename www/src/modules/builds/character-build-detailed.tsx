import { useEffect, useMemo } from 'preact/hooks'

import { useBuildWithDelayedLocs } from '#src/api'
import { getAllRelated } from '#src/api/utils'
import { CharacterPortrait } from '#src/components/characters'
import Spinner from '#src/components/spinners'
import { BtnTabGroup, Tabs, useSelectable } from '#src/components/tabs'
import { OtherItemCardDetailDd, WeaponDetailDd } from '#src/containers/item-cards/dd-cards'
import { ItemAvatar, LabeledItemAvatar } from '#src/containers/item-cards/item-avatars'
import { makeCharacterBuildDeselectHash } from '#src/hashstore'
import { getArtifactTypeIconSrc } from '#src/utils/artifacts'
import { getCharacterPortraitSrc, getCharacterSilhouetteSrc } from '#src/utils/characters'
import { isLoaded } from '#src/utils/hooks'
import { getItemIconSrc } from '#src/utils/items'
import { pluralizeEN } from '#src/utils/strings'
import { getWeaponIconSrc } from '#src/utils/weapons'
import {
	BuildRoleOrDummy,
	CIRCLET_GOBLET_SANDS,
	DUMMY_ROLES,
	genArtMainStatDetail,
	genArtofactAdvice,
	genNotes,
	genSeeCharNotes,
	genSimpleList,
	getRoleData,
	ItemsJoinerWrap,
	makeRoleTitle,
	notesToJSX,
	ToggleCharFav,
} from './common'

import './character-build-detailed.scss'

export function CharacterBuildDetailed({ characterCode }: { characterCode: string }) {
	const [build, isUpdating] = useBuildWithDelayedLocs(characterCode)

	const roleTabs: BuildRoleOrDummy[] = isLoaded(build) ? build.character.roles : DUMMY_ROLES
	const [selectedRoleTab, setSelectedRoleTab] = useSelectable(roleTabs, [characterCode])

	useEffect(() => {
		window.scrollTo(0, 0)
	}, [])

	const weaponListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = getRoleData(build, selectedRoleTab.code)
		if (!role) return []
		return role.weapons.advices.map((advice, i) => (
			<li key={i} className="pt-1">
				{advice.similar.map((item, i) => {
					const weapon = build.weapons.find(x => x.code === item.code)
					if (!weapon) return null
					const isInList = advice.similar.length > 1
					const isLastInList = i >= advice.similar.length - 1
					return (
						<>
							<LabeledItemAvatar
								imgSrc={getWeaponIconSrc(weapon.code)}
								title={
									weapon.name +
									(item.refine === null ? '' : ` [${item.refine}]`) +
									(item.stacks === null
										? ''
										: ` (${item.stacks} ${pluralizeEN(item.stacks, 'stack', 'stacks')})`)
								}
								rarity={weapon.rarity}
								avatarClasses="with-padding"
								classes={`small ${!isInList || isLastInList ? 'mb-1' : ''}`}
								ddProps={{
									DdComponent: WeaponDetailDd,
									ddItems: [weapon],
									related: build.maps,
								}}
							/>
							{genNotes(item)}
							{genSeeCharNotes(item)}
							{isInList && !isLastInList && <ItemsJoinerWrap>or</ItemsJoinerWrap>}
						</>
					)
				})}
			</li>
		))
	}, [build, selectedRoleTab])

	const artifactsListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = getRoleData(build, selectedRoleTab.code)
		if (!role) return []

		return role.artifacts.sets.map((set, i) => {
			return (
				<li key={i} className="pt-1">
					{genArtofactAdvice(set.arts, build)}
					{genNotes(set)}
					{genSeeCharNotes(set)}
				</li>
			)
		})
	}, [build, selectedRoleTab])
	const artifactStatsAndSkillsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab.code)
		return (
			<>
				<h6 className="text-uppercase opacity-75">Main artifact stats</h6>
				<ul className="mb-1 list-unstyled ms-1">
					{CIRCLET_GOBLET_SANDS.map(ac => (
						<li>
							<ItemAvatar
								src={getArtifactTypeIconSrc(ac)}
								classes="small-avatar small my-1 mx-1 bg-dark with-padding align-middle"
							/>
							<b className="text-muted">{ac} — </b>
							{genArtMainStatDetail(role, ac)}
						</li>
					))}
				</ul>
				<div className="opacity-75 small">
					{notesToJSX(role.mainStats.notes)} {genSeeCharNotes(role.mainStats)}
				</div>
				<h6 className="text-uppercase opacity-75 mt-3">Sub artifact stats</h6>
				<ol className="mb-1">
					{role.subStats.advices.map(advice => {
						return (
							<li>
								{genSimpleList(advice.codes)}
								{' ' + genNotes(advice) + genSeeCharNotes(advice)}
							</li>
						)
					})}
				</ol>
				<div className="opacity-75 small">
					{notesToJSX(role.subStats.notes)} {genSeeCharNotes(role.subStats)}
				</div>
				<h6 className="text-uppercase opacity-75 mt-3">Talent Priority</h6>
				<ol>
					{role.talents.advices.map(advice => {
						return <li>{advice}</li>
					})}
				</ol>
				<div className="opacity-75 small">
					{notesToJSX(role.talents.notes)} {genSeeCharNotes(role.subStats)}
				</div>
			</>
		)
	}, [build, selectedRoleTab])
	const notesBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab.code)
		return (
			<>
				<div>{notesToJSX(role.tips)}</div>
				<div>{notesToJSX(role.notes)}</div>
				<div>{notesToJSX(build.character.credits)}</div>
			</>
		)
	}, [build, selectedRoleTab])
	const materialsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const materials = getAllRelated(build.maps.items, build.character.materialCodes)
		return (
			<div className="w-100 d-flex justify-content-between">
				{materials.map(m => (
					<ItemAvatar
						classes="mb-2 mx-1 small-avatar with-padding"
						src={getItemIconSrc(m.code)}
						ddProps={{
							DdComponent: OtherItemCardDetailDd,
							ddItems: [m],
							related: build.maps,
						}}
					/>
				))}
			</div>
		)
	}, [build])
	if (!isLoaded(build)) return <Spinner />
	const CharacterDetailDesktop = (
		<div className="d-none d-xl-block">
			<div className="container float-end">
				<div className="row">
					<div className="col col-3"></div>
					<div className="col col-9">
						<Tabs
							tabs={roleTabs}
							titleFunc={makeRoleTitle}
							selectedTab={selectedRoleTab}
							onTabSelect={setSelectedRoleTab}
						/>
					</div>
				</div>
				<div className="row">
					<div className="col col-3 position-relative">
						<CharacterPortrait src={getCharacterPortraitSrc(characterCode)} classes="w-100" />
						<div className="mt-3">{materialsBlock}</div>
						<ToggleCharFav
							classes="fs-3 position-absolute top-0 end-0 m-2"
							characterCode={characterCode}
						/>
					</div>
					<div className="col col-9">
						<div className="d-flex">
							<div className="flex-fill w-33 p-3">
								<h6 className="text-uppercase opacity-75">Weapon</h6>
								<ol className="items-list">{weaponListBlock}</ol>
							</div>
							<div className="flex-fill w-33 p-3">
								<h6 className="text-uppercase opacity-75">Artifacts</h6>
								<ol className="items-list">{artifactsListBlock}</ol>
								<div></div>
							</div>
							<div className="flex-fill w-33 p-3">{artifactStatsAndSkillsBlock}</div>
						</div>
						<div className="w-100">
							<div className="p-3">
								<h6 className="text-uppercase opacity-75">Notes</h6>
								<div className="text-muted">{notesBlock}</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
	const CharacterDetailMobile = (
		<div className="d-xl-none">
			<CharacterPortrait
				src={getCharacterSilhouetteSrc(characterCode)}
				classes="w-75 character-portrait-mobile"
			/>
			<BtnTabGroup
				tabs={roleTabs}
				selectedTab={selectedRoleTab}
				onTabSelect={setSelectedRoleTab}
				classes="w-100 mt-3 mb-0"
			/>
			<div className="">
				<div className="my-3">
					<h6 className="text-uppercase opacity-75">Ascension materials</h6>
					{materialsBlock}
				</div>
				<div className="my-3">
					<h6 className="text-uppercase opacity-75">Artifacts</h6>
					<ol className="items-list">{artifactsListBlock}</ol>
				</div>
				<div className="my-3">{artifactStatsAndSkillsBlock}</div>
				<div className="my-3">
					<h6 className="text-uppercase opacity-75">Weapon</h6>
					<ol className="items-list">{weaponListBlock}</ol>
				</div>
			</div>
			<div>
				<h6 className="text-uppercase opacity-75">Notes</h6>
				<div className="opacity-75">{notesBlock}</div>
			</div>
		</div>
	)
	return (
		<div className="character-build-detailed mt-2 mb-3">
			<div>
				<a
					className="btn btn-secondary align-baseline"
					type="submit"
					href={makeCharacterBuildDeselectHash()}
				>
					<span className="fs-4 lh-1 opacity-75">‹ </span> Back
				</a>
				<h5 className="ps-3 pe-1 d-inline align-baseline">
					{isLoaded(build) ? build.character.name : ''}
				</h5>
				<ToggleCharFav classes="fs-3 d-inline align-middle d-xl-none" characterCode={characterCode} />
			</div>
			{CharacterDetailDesktop}
			{CharacterDetailMobile}
		</div>
	)
}
