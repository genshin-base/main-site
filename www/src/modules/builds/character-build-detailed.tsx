import { useEffect, useMemo, useState } from 'preact/hooks'

import { ArtifactRef, ArtifactRefNode } from '#lib/parsing/helperteam/artifacts'
import { CharacterBuildInfoRole } from '#lib/parsing/helperteam/characters'
import { CompactTextParagraphs, TextNode } from '#lib/parsing/helperteam/text'
import { mustBeDefined } from '#lib/utils/values'
import { MapAllByCode } from '#src/api'
import { isLoaded, useFetch } from '#src/api/hooks'
import { CharacterPortrait } from '#src/components/characters'
import Spinner from '#src/components/spinners'
import { BtnTabGroup, Tab, Tabs } from '#src/components/tabs'
import { WeaponDetailDd } from '#src/containers/item-cards/dd-cards'
import { ItemAvatar, LabeledItemAvatar } from '#src/containers/item-cards/item-cards'
import { apiGetCharacter, CharacterFullInfoWithRelated } from '#src/generated'
import { makeCharacterBuildDeselectHash } from '#src/hashstore'
import { getArtifactIconSrc, getArtifactTypeIconSrc } from '#src/utils/artifacts'
import { getCharacterPortraitSrc, getCharacterSilhouetteSrc } from '#src/utils/characters'
import { pluralizeEN } from '#src/utils/strings'
import { getWeaponIconSrc } from '#src/utils/weapons'

import './character-build-detailed.scss'

const DUMMY_TAB: Tab = {
	title: '…',
	code: '',
}

function makeRoleTab(r: CharacterBuildInfoRole): Tab {
	return {
		code: r.code,
		title: (
			<span key={r.code}>
				{r.isRecommended ? (
					<span className="fs-4 lh-1 opacity-75 text-warning align-bottom">🟊</span>
				) : null}
				{r.code}
			</span>
		),
	}
}
function getRoleData(build: CharacterFullInfoWithRelated, selectedRoleTab: Tab) {
	return mustBeDefined(build.character.roles.find(x => x.code === selectedRoleTab.code))
}
function genSimpleList(arr: string[]) {
	return arr.join(', ')
}
function notesWrap(str) {
	return <div className="text-muted small">{str}</div>
}
function genNotes(item: { notes: CompactTextParagraphs | null }) {
	return item.notes === null ? '' : notesWrap(JSON.stringify(item.notes))
}
function genSeeCharNotes(item: { seeCharNotes: boolean }) {
	return '' //TODO
	return item.seeCharNotes ? notesWrap(' (see notes)') : ''
}
function genArtMainStatDetail(role: CharacterBuildInfoRole, itemCode: 'circlet' | 'goblet' | 'sands') {
	return (
		<span className="">
			{genSimpleList(role.mainStats[itemCode].codes) +
				' ' +
				genNotes(role.mainStats[itemCode]) +
				genSeeCharNotes(role.mainStats[itemCode])}
		</span>
	)
}

//todo более адекватное место
export function notesToJSX(tips: CompactTextParagraphs | null) {
	function processString(str: string) {
		return str
			.split('\n')
			.map((sub, i, arr) => [sub, i < arr.length - 1 ? <br /> : ''])
			.flat()
			.filter(a => a)
	}
	function processObj(tip: TextNode) {
		if (typeof tip === 'string') return processString(tip)
		if ('p' in tip) return <p>{notesToJSX(tip.p)}</p>
		if ('b' in tip) return <b className="opacity-75 text-normal">{notesToJSX(tip.b)}</b>
		if ('i' in tip) return <i>{notesToJSX(tip.i)}</i>
		if ('u' in tip) return <u>{notesToJSX(tip.u)}</u>
		if ('s' in tip) return <s>{notesToJSX(tip.s)}</s>
		if ('a' in tip) return <a href={tip.href}>{notesToJSX(tip.a)}</a>
		console.warn('unknown element type in notes: ', tip)
		return <span>{JSON.stringify(tip)}</span>
	}
	if (!tips) return null
	if (Array.isArray(tips)) return tips.map(processObj)
	return processObj(tips)
}

const CIRCLET_GOBLET_SANDS = ['sands', 'goblet', 'circlet'] as const
const ATK_ART_SET = {
	//todo
	name: '18% atk',
	rarity: 2,
} as const
function genArtofactAdvice(
	set: ArtifactRef | ArtifactRefNode,
	build: MapAllByCode<CharacterFullInfoWithRelated>,
	isLast = true,
) {
	// todo notes
	if ('code' in set) {
		//ArtifactRef
		const artifact = set.code === '18%-atk' ? ATK_ART_SET : build.maps.artifacts.get(set.code)
		if (!artifact) return null
		return (
			<LabeledItemAvatar
				imgSrc={getArtifactIconSrc(set.code)}
				rarity={artifact.rarity}
				title={artifact.name}
				key={set.code}
				avatarBadge={'x' + set.count}
				classes={`small ${isLast ? 'mb-1' : ''}`}
			/>
		)
	} else {
		//ArtifactRefNode
		return set.arts.map((art, i) => {
			const isLastInList = i >= set.arts.length - 1
			return (
				<>
					{genArtofactAdvice(art, build, isLastInList)}
					{!isLastInList && <div className="text-center text-muted small ">{set.op}</div>}
				</>
			)
		})
	}
}
export function CharacterBuildDetailed({ characterCode }: { characterCode: string }) {
	const build = useFetch(sig => apiGetCharacter(characterCode, sig), [characterCode])
	// на случай серверного рендера: билд тут будет загружен сразу
	const roleTabs = useMemo(
		() => (isLoaded(build) ? build.character.roles.map(makeRoleTab) : [DUMMY_TAB]),
		[build],
	)
	const [selectedRoleTabRaw, setSelectedRoleTab] = useState(DUMMY_TAB)
	// на случай, если массив вкладок уже реактивно изменился, а выбранная вкладка ещё старая
	const selectedRoleTab = roleTabs.includes(selectedRoleTabRaw)
		? selectedRoleTabRaw
		: roleTabs[0] ?? DUMMY_TAB

	useEffect(() => {
		window.scrollTo(0, 0)
	}, [])

	const weaponListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = getRoleData(build, selectedRoleTab)
		if (!role) return []
		return role.weapons.advices.map((advice, i) => (
			<li key={i} className="p-0 p-xl-1 pt-1 pt-xl-2">
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
								classes={`small ${!isInList || isLastInList ? 'mb-1' : ''}`}
								DdComponent={WeaponDetailDd}
								item={weapon}
								related={build.maps}
							/>
							{genNotes(item)}
							{genSeeCharNotes(item)}
							{isInList && !isLastInList && (
								<div className="text-center text-muted small ">or</div>
							)}
						</>
					)
				})}
			</li>
		))
	}, [build, selectedRoleTab])

	const artifactsListBlock = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = getRoleData(build, selectedRoleTab)
		if (!role) return []

		return role.artifacts.sets.map((set, i) => {
			return (
				<li key={i} className="p-0 p-xl-1 pt-1 pt-xl-2">
					{genArtofactAdvice(set.arts, build)}
					{genNotes(set)}
					{genSeeCharNotes(set)}
				</li>
			)
		})
	}, [build, selectedRoleTab])
	const artifactStatsAndSkillsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab)
		return (
			<>
				<h6 className="text-uppercase opacity-75">Main artifact stats</h6>
				<ul className="mb-1 list-unstyled ms-1">
					{CIRCLET_GOBLET_SANDS.map(ac => (
						<li>
							<ItemAvatar
								src={getArtifactTypeIconSrc(ac)}
								classes="small-avatar small mb-1 me-1 mb-xxl-2 me-xxl-2 p-1 bg-dark"
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
		const role = getRoleData(build, selectedRoleTab)
		return (
			<>
				<div>{notesToJSX(role.tips)}</div>
				<div>{notesToJSX(role.notes)}</div>
				<div>{notesToJSX(build.character.credits)}</div>
			</>
		)
	}, [build, selectedRoleTab])
	if (!isLoaded(build)) return <Spinner />
	const CharacterDetailDesktop = (
		<div className="d-none d-xl-block">
			<div className="container float-end">
				<div className="row">
					<div className="col col-3"></div>
					<div className="col col-9">
						<Tabs
							tabs={roleTabs}
							selectedTab={selectedRoleTab}
							onTabSelect={setSelectedRoleTab}
						/>
					</div>
				</div>
				<div className="row">
					<div className="col col-3">
						<CharacterPortrait src={getCharacterPortraitSrc(characterCode)} classes="w-100" />
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
					</div>
				</div>
				<div className="row">
					<div className="col col-3"></div>
					<div className="col col-9">
						<div className="p-3">
							<h6 className="text-uppercase opacity-75">Notes</h6>
							<div className="text-muted">{notesBlock}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
	const CharacterDetailMobile = (
		<div class="d-xl-none">
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
					<h6 className="text-uppercase opacity-75">Artifacts</h6>
					<ol className="items-list">{artifactsListBlock}</ol>
					<div></div>
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
				<h5 className="px-3 d-inline align-baseline">
					{isLoaded(build) ? build.character.name : ''}
				</h5>
			</div>
			{CharacterDetailDesktop}
			{CharacterDetailMobile}
		</div>
	)
}
