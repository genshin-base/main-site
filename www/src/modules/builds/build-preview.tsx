import { useMemo, useState } from 'preact/hooks'

import { useBuildWithDelayedLocs } from '#src/api'
import { getAllRelated } from '#src/api/utils'
import Spinner from '#src/components/spinners'
import { BtnTabGroup, Tabs, useSelectedable } from '#src/components/tabs'
import { FavoriteCharacters } from '#src/containers/character-picker/favorite-characters'
import { OtherItemCardDetailDd } from '#src/containers/item-cards/dd-cards'
import { ItemAvatar } from '#src/containers/item-cards/item-cards'
import { getArtifactTypeIconSrc } from '#src/utils/artifacts'
import { isLoaded } from '#src/utils/hooks'
import { getItemIconSrc } from '#src/utils/items'
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

import './character-build-preview.scss'

function BuildPreview({ characterCode }: { characterCode: string }): JSX.Element {
	const build = useBuildWithDelayedLocs(characterCode)

	const roleTabs: BuildRoleOrDummy[] = isLoaded(build) ? build.character.roles : DUMMY_ROLES
	const [selectedRoleTab, setSelectedRoleTab] = useSelectedable(roleTabs, [characterCode])

	const artifactsListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = getRoleData(build, selectedRoleTab.code)
		if (!role) return []
		const listTimit = 1
		return (
			<ol>
				{role.artifacts.sets.map((set, i) => {
					if (i > listTimit) return
					return (
						<li key={i} className="pt-1">
							{genArtofactAdvice(set.arts, build, false)}
						</li>
					)
				})}
				{/* //todo href */}
				{role.artifacts.sets.length > listTimit ? (
					<li className="pt-1 text-muted">
						<a className="link-secondary text-muted" href="/builds">
							more on build page
						</a>
					</li>
				) : null}
			</ol>
		)
	}, [build, selectedRoleTab])

	const artifactMainStatsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab.code)
		return (
			<ul className="mb-1 list-unstyled ms-1 pt-1 ps-2">
				{CIRCLET_GOBLET_SANDS.map(ac => (
					<li>
						<ItemAvatar
							src={getArtifactTypeIconSrc(ac)}
							classes="mb-1 mx-1 small-avatar bg-dark with-padding align-middle"
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
				<div className="d-none d-xl-flex ">
					<h5 className="py-2 m-0 me-2 d-block ">{build.character.name}</h5>
					<Tabs
						tabs={roleTabs}
						titleFunc={makeRoleTitle}
						selectedTab={selectedRoleTab}
						onTabSelect={setSelectedRoleTab}
						classes="mb-2 flex-grow-1"
					/>
				</div>
				<div className="d-flex d-xl-none align-items-center">
					<h5 className="mb-0 pt-2 me-2">{build.character.name}</h5>
					<BtnTabGroup
						tabs={roleTabs}
						titleFunc={makeRoleTitle}
						selectedTab={selectedRoleTab}
						onTabSelect={setSelectedRoleTab}
						classes="w-100 mt-3 mb-2"
					/>
				</div>
				<div className="row small gy-2">
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
					<div className="col-6">
						<a type="button" className="btn btn-link btn-sm w-100">
							Full build info
						</a>
					</div>
					<div className="col-6">
						<a type="button" className="btn btn-link btn-sm w-100">
							Character lore
						</a>
					</div>
				</div>
			</div>
		</div>
	)
}
export function BuildsPreviewsWrap({ classes = '' }: { classes?: string }): JSX.Element {
	const [selectedCharacterCode, setSelectedCharacterCode] = useState<string | null>(null)
	return (
		<div className={`character-build-preview ${classes}`}>
			<FavoriteCharacters
				onCharacterSelect={setSelectedCharacterCode}
				shoudSelectFirst={!selectedCharacterCode}
			/>
			{selectedCharacterCode ? <BuildPreview characterCode={selectedCharacterCode} /> : <Spinner />}
		</div>
	)
}
