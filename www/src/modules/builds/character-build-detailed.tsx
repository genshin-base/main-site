import { useCallback, useMemo } from 'preact/hooks'

import { WebApp } from '#lib/telegram/webapp'
import { arrOrItemToArr } from '#lib/utils/collections'
import { getBuildSummaryPath } from '#lib/www-utils/summaries'
import { CharacterFullInfoWithRelated } from '#src/../../lib/parsing/combine'
import { getAllRelated, MapAllByCode } from '#src/api/utils'
import { BlockHeader } from '#src/components/block-header'
import { CharacterPortrait } from '#src/components/characters'
import { CentredSpinner } from '#src/components/placeholders'
import { BtnTabGroup, Tabs, useSelectable } from '#src/components/tabs'
import { CharacterRating } from '#src/containers/abyss/char-rating'
import { OtherItemCard, WeaponCard } from '#src/containers/item-cards/dd-cards'
import { ItemAvatar, ItemsDataContext, LabeledItemAvatar } from '#src/containers/item-cards/item-avatars'
import {
	I18N_ART_STATS_PRIORITY,
	I18N_ART_TYPE,
	I18N_ARTIFACTS,
	I18N_ASC_MATERIALS,
	I18N_BACK,
	I18N_CONJUCTIONS,
	I18N_NOTES,
	I18N_STAT_NAME,
	I18N_SUBSTATS_PRIORITY,
	I18N_TALENT_NAME,
	I18N_TALENTS_PRIORITY,
	I18N_USAGE,
	I18N_WEAPON_REFINE,
	I18N_WEAPON_STACKS_COUNT,
	I18N_WEAPONS,
} from '#src/i18n/i18n'
import { A } from '#src/routes/router'
import { getArtifactTypeIconSrc } from '#src/utils/artifacts'
import {
	getCharacterAvatarLargeSrc,
	getCharacterPortraitSrc,
	getCharacterSilhouetteSrc,
} from '#src/utils/characters'
import { getItemIconSrc } from '#src/utils/items'
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
	const goBack = useCallback(() => {
		history.back()
	}, [])
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
								(item.refine === null ? '' : ` [${I18N_WEAPON_REFINE(item.refine)}]`) +
								(item.stacks === null ? '' : ` (${I18N_WEAPON_STACKS_COUNT(item.stacks)})`)
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
				<BlockHeader>{I18N_ART_STATS_PRIORITY}</BlockHeader>
				<ul className="mb-1 list-unstyled ms-1 small">
					{CIRCLET_GOBLET_SANDS.map(ac => (
						<li className="my-1 ms-1">
							<ItemAvatar
								src={getArtifactTypeIconSrc(ac)}
								isNoBg={true}
								classes="small-avatar small with-padding align-middle artifact-main-stat-icon webapp-icon-shadow"
							/>
							<b className="text-muted">{I18N_ART_TYPE(ac)} — </b>
							{genArtMainStatDetail(role, ac)}
						</li>
					))}
				</ul>
				<div className="opacity-75 small">
					{notesToJSX(role.mainStats.notes)} {genSeeCharNotes(role.mainStats)}
				</div>
				<BlockHeader classes="mt-3">{I18N_SUBSTATS_PRIORITY}</BlockHeader>
				<ol className="mb-1 small">
					{role.subStats.advices.map(advice => {
						return (
							<li>
								<div className="opacity-75">
									{genSimpleList(advice.codes.map(I18N_STAT_NAME))} {genNotes(advice)}
									{genSeeCharNotes(advice)}
								</div>
							</li>
						)
					})}
				</ol>
				<div className="opacity-75 small">
					{notesToJSX(role.subStats.notes)} {genSeeCharNotes(role.subStats)}
				</div>
				<BlockHeader classes="mt-3">{I18N_TALENTS_PRIORITY}</BlockHeader>
				<ol className="small">
					{role.talents.advices.map(advice => {
						return (
							<li>
								<div className="opacity-75">
									{arrOrItemToArr(advice).map(I18N_TALENT_NAME).join(', ')}
								</div>
							</li>
						)
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
				<div className="mb-2">{notesToJSX(role.tips)}</div>
				<div className="mb-2">{notesToJSX(role.notes)}</div>
				<div>{notesToJSX(build.character.credits)}</div>
			</>
		)
	}, [build, selectedRoleTab])
	const materialsBlock = useMemo(() => {
		const materials = getAllRelated(build.maps.items, build.character.materialCodes)
		return (
			<div className="w-100 d-flex flex-wrap justify-content-between">
				{materials.map((m, i) => (
					<ItemAvatar
						classes={`${
							i === materials.length - 1 ? 'ms-1' : i === 0 ? 'me-1' : 'mx-1'
						} small-avatar with-padding`}
						src={getItemIconSrc(m.code)}
						ddComponent={<OtherItemCard item={m} related={build.maps} />}
					/>
				))}
			</div>
		)
	}, [build])
	const CharacterDetailDesktop = (
		<div className="d-none d-xl-block">
			<div className="container">
				<div className="row">
					<div className="col col-3 p-0 summary-hide">
						<button className="btn btn-secondary align-self-center" onClick={goBack}>
							<span className="fs-4 lh-1 opacity-75">‹ </span> {I18N_BACK}
						</button>
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
								classes="fs-3 position-absolute top-0 end-0 summary-hide"
								characterCode={characterCode}
							/>
							<div className="mt-3 mb-4">
								<BlockHeader>{I18N_USAGE}</BlockHeader>
								<CharacterRating characterCode={characterCode} />
							</div>
							{/* <div className="my-2">
								<BlockHeader>{'Отряды'}</BlockHeader>
								<RecommendedTeams characterCode={characterCode} />
							</div> */}
						</div>
					</div>
					<div className="col col-9">
						<div className="d-flex">
							<div className="flex-fill w-33 p-3">
								<BlockHeader>{I18N_WEAPONS}</BlockHeader>
								<ol className="items-list">{weaponListBlock}</ol>
							</div>
							<div className="flex-fill w-33 p-3">
								<BlockHeader>{I18N_ARTIFACTS}</BlockHeader>
								<ol className="items-list">{artifactsListBlock}</ol>
								<div></div>
							</div>
							<div className="flex-fill w-33 p-3">{artifactStatsAndSkillsBlock}</div>
						</div>
						<div className="w-100 summary-hide">
							<div className="p-3">
								<BlockHeader>{I18N_NOTES}</BlockHeader>
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
			<div className="mt-3">
				<BlockHeader>{I18N_USAGE}</BlockHeader>
				<CharacterRating characterCode={characterCode} />
			</div>
			<div className="my-4">
				<BlockHeader>{I18N_ASC_MATERIALS}</BlockHeader>
				{materialsBlock}
			</div>
			<BtnTabGroup
				tabs={roleTabs}
				titleFunc={makeRoleTitle}
				selectedTab={selectedRoleTab}
				onTabSelect={setSelectedRoleTab}
				classes="w-100 btn-group-sm mb-n1"
			/>
			<div className="">
				<div className="my-4">
					<BlockHeader>{I18N_ARTIFACTS}</BlockHeader>
					<ol className="items-list">{artifactsListBlock}</ol>
				</div>
				<div className="my-4">{artifactStatsAndSkillsBlock}</div>
				<div className="my-4">
					<BlockHeader>{I18N_WEAPONS}</BlockHeader>
					<ol className="items-list">{weaponListBlock}</ol>
				</div>
			</div>
			<div>
				<BlockHeader>{I18N_NOTES}</BlockHeader>
				<div className="text-muted">{notesBlock}</div>
			</div>
		</div>
	)
	return (
		<ItemsDataContext.Provider value={build.maps}>
			<div className="character-build-detailed mt-2 mb-3 position-relative">
				<div className="d-flex d-xl-none mt-3">
					<A className="btn btn-secondary align-self-center" type="submit" href="/builds">
						<span className="fs-4 lh-1 opacity-75">‹ </span> {I18N_BACK}
					</A>
					{BUNDLE_ENV.IS_TG_MINI_APP && (
						<WebAppBuildShareButton
							characterCode={characterCode}
							roleCode={selectedRoleTab.code}
						/>
					)}
					<h5 className="ps-3 pe-1 m-0 align-self-center w-50 d-inline-block overflow-hidden text-truncate text-wrap">
						{build.character.name}
					</h5>
					<div className="align-self-end ms-auto d-flex">
						<ToggleCharFav classes="fs-3" characterCode={characterCode} />
						<ItemAvatar
							src={getCharacterAvatarLargeSrc(characterCode)}
							classes="large-avatar mt-n5 align-self-end"
						/>
					</div>
				</div>
				{isUpdating ? <CentredSpinner /> : null}
				<div className={isUpdating ? 'opacity-50 pe-none' : ''}>
					{CharacterDetailDesktop}
					{CharacterDetailMobile}
				</div>
			</div>
		</ItemsDataContext.Provider>
	)
}

function WebAppBuildShareButton({ characterCode, roleCode }: { characterCode: string; roleCode: string }) {
	const onShareClick = useCallback(() => {
		if (WebApp.isVersionAtLeast('6.9')) {
			WebApp.requestWriteAccess(granted => {
				if (granted) {
					const url = '/api/webapp/share'
					const headers = { 'content-type': 'application/json' }
					const body = JSON.stringify({
						character: characterCode,
						role: roleCode,
						initData: WebApp.initData,
					})
					fetch(url, { method: 'POST', body, headers })
						.then(r => r.json())
						.catch(err => {
							WebApp.showAlert(err + '')
						})
				}
			})
		} else {
			let lang = WebApp.initDataUnsafe.user?.language_code ?? 'en'
			if (!BUNDLE_ENV.LANGS.includes(lang)) lang = BUNDLE_ENV.LANGS[0]

			const mediaOrigin = new URL(BUNDLE_ENV.ASSET_PATH + 'media/', location.origin).toString()
			const imgSrc = getBuildSummaryPath(mediaOrigin, characterCode, roleCode, lang, 'png')

			const text = ''

			location.href =
				`https://t.me/share/url` +
				`?url=${encodeURIComponent(imgSrc)}&text=${encodeURIComponent(text)}`
		}
	}, [characterCode, roleCode])
	return <button onClick={onShareClick}>шаре</button>
}
