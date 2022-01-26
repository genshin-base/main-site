import './character-build-preview.scss'

import { getAllRelated } from '#src/api'
import { isLoaded, useBuildWithDelayedLocs } from '#src/api/hooks'
import { CharacterPortrait } from '#src/components/characters'
import Spinner from '#src/components/spinners'
import { BtnTabGroup, Tabs, useSelectedable } from '#src/components/tabs'
import { OtherItemCardDetailDd } from '#src/containers/item-cards/dd-cards'
import { ItemAvatar } from '#src/containers/item-cards/item-cards'
import { getArtifactTypeIconSrc } from '#src/utils/artifacts'
import {
	getCharacterAvatarSrc,
	getCharacterPortraitSrc,
	getCharacterSilhouetteSrc,
} from '#src/utils/characters'
import { getItemIconSrc } from '#src/utils/items'
import { useMemo, useState } from 'preact/hooks'
import {
	BuildRoleOrDummy,
	CIRCLET_GOBLET_SANDS,
	DUMMY_ROLES,
	genArtMainStatDetail,
	genArtofactAdvice,
	genSimpleList,
	getRoleData,
	makeRoleTitle,
} from './common'

function BuildPreview({ characterCode }: { characterCode: string }): JSX.Element {
	const build = useBuildWithDelayedLocs(characterCode)
	isLoaded(build) && console.log(build.maps.enemies.get('treasure-hoarders'))

	// на случай серверного рендера: билд тут будет загружен сразу
	const roleTabs: BuildRoleOrDummy[] = isLoaded(build) ? build.character.roles : DUMMY_ROLES
	const [selectedRoleTab, setSelectedRoleTab] = useSelectedable(roleTabs)

	const artifactsListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = getRoleData(build, selectedRoleTab.code)
		if (!role) return []

		return (
			<ol>
				{role.artifacts.sets.map((set, i) => {
					if (i > 2) return
					return (
						<li key={i} className="pt-1">
							{genArtofactAdvice(set.arts, build, false)}
						</li>
					)
				})}
			</ol>
		)
	}, [build, selectedRoleTab])

	const artifactMainStatsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab.code)
		return (
			<ul className="mb-1 list-unstyled ms-1 pt-1 ps-2">
				{CIRCLET_GOBLET_SANDS.map(ac => (
					<li className="mb-1">
						<ItemAvatar
							src={getArtifactTypeIconSrc(ac)}
							classes="small-avatar small mb-1 me-1 mb-xxl-2 me-xxl-2 p-1 bg-dark with-padding align-middle"
						/>
						{genArtMainStatDetail(role, ac, true)}
					</li>
				))}
			</ul>
		)
	}, [build, selectedRoleTab])
	const artifactSubStatsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab.code)
		return (
			<ol className="mb-1 pt-2">
				{role.subStats.advices.map(advice => {
					return <li>{genSimpleList(advice.codes)}</li>
				})}
			</ol>
		)
	}, [build, selectedRoleTab])

	const talentsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab.code)
		return (
			<>
				<ol>
					{role.talents.advices.map(advice => {
						return <li>{advice}</li>
					})}
				</ol>
			</>
		)
	}, [build, selectedRoleTab])

	const materialsBlock = useMemo(() => {
		//todo только главные
		if (!isLoaded(build)) return null
		const materials = getAllRelated(build.maps.items, build.character.materialCodes)
		return (
			<div className="d-flex justify-content-between flex-wrap px-2">
				{materials.map(m => (
					<ItemAvatar
						classes="mb-2 mx-1 small-avatar with-padding flex-shrink-0"
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
	return (
		<div className="character-build-preview">
			<div>{build.character.name}</div>
			{/* <div className="d-none d-xl-block">
				<CharacterPortrait src={getCharacterPortraitSrc(characterCode)} classes="w-100" />
			</div>
			<div className="d-xl-none">
				<CharacterPortrait
					src={getCharacterSilhouetteSrc(characterCode)}
					classes="w-75 character-portrait-mobile"
				/>
			</div> */}
			<div>
				<div className="d-none d-xl-block">
					<Tabs
						tabs={roleTabs}
						titleFunc={makeRoleTitle}
						selectedTab={selectedRoleTab}
						onTabSelect={setSelectedRoleTab}
						classes="mb-2"
					/>
				</div>
				<div className="d-xl-none">
					<BtnTabGroup
						tabs={roleTabs}
						titleFunc={makeRoleTitle}
						selectedTab={selectedRoleTab}
						onTabSelect={setSelectedRoleTab}
						classes="w-100 mt-3 mb-2"
					/>
				</div>
				{/* todo link to build */}
				<div className="row small">
					<div className="col-lg-4 col-12">
						<h6 className="opacity-75">Artifacts</h6>
						<div>{artifactsListBlock}</div>
					</div>
					<div className="col-lg-4 col-6">
						<h6 className="opacity-75">Artifact stats priority</h6>
						<div>{artifactMainStatsBlock}</div>
					</div>
					<div className="col-lg-4 col-6">
						<h6 className="opacity-75">Substats priority</h6>
						<div>{artifactSubStatsBlock}</div>
					</div>
					<div className="col-lg-4 col-6">
						<h6 className="opacity-75">Talents Priority</h6>
						<div>{talentsBlock}</div>
					</div>
					<div className="col-lg-8 col-6">
						<h6 className="opacity-75">Materials</h6>
						<div>{materialsBlock}</div>
					</div>
				</div>
			</div>
		</div>
	)
}
export function BuildsPreviewsWrap({ classes = '' }: { classes?: string }): JSX.Element {
	const characterCodes = ['amber', 'bennett', 'kokomi'] //todo

	const [selectedCharacterCode, setSelectedCharacterCode] = useState<string>(characterCodes[0])
	const characterAvatars = useMemo(
		() =>
			characterCodes.map(code => (
				<ItemAvatar
					src={getCharacterAvatarSrc(code)}
					// rarity={charactersShortList.find(x => x.code === code)?.rarity ?? 5}
					classes="mb-1 me-1 mb-xxl-2 me-xxl-2 small-avatar align-middle"
					key={code}
					onClick={() => setSelectedCharacterCode(code)}
				/>
			)),
		[characterCodes],
	)
	return (
		<div className={`character-build-preview ${classes}`}>
			<h6 class="text-uppercase opacity-75">Favourite characters</h6>
			{characterAvatars}
			<BuildPreview characterCode={selectedCharacterCode} key={selectedCharacterCode} />
		</div>
	)
}
