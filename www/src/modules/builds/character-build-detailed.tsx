import { useMemo } from 'preact/hooks'
import { getAllRelated, MapAllByCode } from '#src/api/utils'
import { CharacterPortrait } from '#src/components/characters'
import { CentredSpinner } from '#src/components/spinners'
import { BtnTabGroup, Tabs, useSelectable } from '#src/components/tabs'
import { OtherItemCardDetailDd, WeaponDetailDd } from '#src/containers/item-cards/dd-cards'
import { ItemAvatar, LabeledItemAvatar } from '#src/containers/item-cards/item-avatars'
import { A } from '#src/routes/router'
import { getArtifactTypeIconSrc } from '#src/utils/artifacts'
import {
	getCharacterAvatarSrc,
	getCharacterPortraitSrc,
	getCharacterSilhouetteSrc,
} from '#src/utils/characters'

import { getItemIconSrc } from '#src/utils/items'
import { pluralizeEN } from '#src/utils/strings'
import { getWeaponIconSrc } from '#src/utils/weapons'
import {
	BuildRoleOrDummy,
	CIRCLET_GOBLET_SANDS,
	genArtifactAdvice,
	genArtMainStatDetail,
	genNotes,
	genSeeCharNotes,
	genSimpleList,
	getRoleData,
	ItemsJoinerWrap,
	ItemsListGroupWrap,
	makeRoleTitle,
	notesToJSX,
	ToggleCharFav,
} from './common'

import './character-build-detailed.scss'
import { CharacterFullInfoWithRelated } from '#src/../../lib/parsing/combine'

export function CharacterBuildDetailed({
	build,
	isUpdating,
}: {
	build: MapAllByCode<CharacterFullInfoWithRelated>
	isUpdating: boolean
}): JSX.Element {
	const roleTabs: BuildRoleOrDummy[] = build.character.roles
	const characterCode = build.character.code
	const [selectedRoleTab, setSelectedRoleTab] = useSelectable(roleTabs, [characterCode])

	const weaponListBlock = useMemo(() => {
		const role = getRoleData(build, selectedRoleTab.code)
		if (!role) return []
		return role.weapons.advices.map((advice, i) => {
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
			})
			return (
				<li key={i} className="pt-1">
					{isInList ? <ItemsListGroupWrap>{map}</ItemsListGroupWrap> : map}
				</li>
			)
		})
	}, [build, selectedRoleTab])

	const artifactsListBlock = useMemo(() => {
		const role = getRoleData(build, selectedRoleTab.code)
		if (!role) return []

		return role.artifacts.sets.map((set, i) => {
			return (
				<li key={i} className="pt-1">
					{genArtifactAdvice(set.arts, build)}
					{genNotes(set)}
					{genSeeCharNotes(set)}
				</li>
			)
		})
	}, [build, selectedRoleTab])
	const artifactStatsAndSkillsBlock = useMemo(() => {
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
		const materials = getAllRelated(build.maps.items, build.character.materialCodes)
		return (
			<div className="w-100 d-flex flex-wrap justify-content-between">
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
	const CharacterDetailDesktop = (
		<div className="d-none d-xl-block">
			<div className="container">
				<div className="row">
					<div className="col col-3 p-0">
						<A className="btn btn-secondary align-self-center" type="submit" href="/builds">
							<span className="fs-4 lh-1 opacity-75">‹ </span> Back
						</A>
					</div>
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
					<div className="col col-3 pt-3">
						<div className="position-relative">
							<CharacterPortrait src={getCharacterPortraitSrc(characterCode)} classes="w-100" />
							<div className="mt-3">{materialsBlock}</div>
							<ToggleCharFav
								classes="fs-3 position-absolute top-0 end-0"
								characterCode={characterCode}
							/>
						</div>
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
		<div className="character-build-detailed mt-2 mb-3 position-relative">
			<div className="d-flex d-xl-none mt-3">
				<A className="btn btn-secondary align-self-center" type="submit" href="/builds">
					<span className="fs-4 lh-1 opacity-75">‹ </span> Back
				</A>
				<h5 className="ps-3 pe-1 m-0 align-self-center">{build.character.name}</h5>
				<ToggleCharFav classes="fs-3 align-self-center" characterCode={characterCode} />
				<ItemAvatar
					src={getCharacterAvatarSrc(characterCode)}
					classes="large-avatar align-self-end mt-n5 ms-auto"
				/>
			</div>
			{isUpdating ? <CentredSpinner /> : null}
			<div className={isUpdating ? 'opacity-50 pe-none' : ''}>
				{CharacterDetailDesktop}
				{CharacterDetailMobile}
			</div>
		</div>
	)
}
