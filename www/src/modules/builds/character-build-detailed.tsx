import { useEffect, useMemo, useState } from 'preact/hooks'

import { CharacterBuildInfoRole } from '#src/../../lib/parsing/helperteam/characters'
import { isLoaded, useFetch } from '#src/api/hooks'
import { CharacterPortrait } from '#src/components/characters'
import { BtnTabGroup, Tab, Tabs } from '#src/components/tabs'
import { ItemAvatar, LabeledItemAvatar } from '#src/containers/item-cards/item-cards'
import { apiGetCharacterFullInfo } from '#src/generated'
import { makeCharacterBuildDeselectHash } from '#src/hashstore'
import { getCharacterPortraitSrc, getCharacterSilhouetteSrc } from '#src/utils/characters'
import { pluralizeEN } from '#src/utils/strings'
import { getWeaponIconSrc } from '#src/utils/weapons'

import './character-build-detailed.scss'
import Spinner from '#src/components/spinners'
import { getArtifactTypeIconSrc } from '#src/utils/artifacts'

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
function getRoleData(build, selectedRoleTab) {
	return build.character.roles.find(x => x.code === selectedRoleTab.code)
}
function genSimpleList(arr) {
	return arr.join(', ')
}
function genNotes(item) {
	return item.notes === null ? '' : JSON.stringify(item.notes)
}
function genSeeCharNotes(item) {
	return item.seeCharNotes ? ' (see notes)' : ''
}
function genArtMainStatDetail(role, itemCode) {
	return (
		<span className="">
			{genSimpleList(role.mainStats[itemCode].codes) +
				' ' +
				genNotes(role.mainStats[itemCode]) +
				genSeeCharNotes(role.mainStats[itemCode])}
		</span>
	)
}
function notesToJSX(tips) {
	function processString(str) {
		return str
			.split('\n')
			.map((sub, i, arr) => [sub, i < arr.length - 1 ? <br /> : ''])
			.flat()
			.filter(a => a)
	}
	function processObj(tip) {
		if ('p' in tip) return <p>{notesToJSX(tip.p)}</p>
		if ('b' in tip) return <b className="opacity-75 text-normal">{notesToJSX(tip.b)}</b>
		if ('i' in tip) return <i>{notesToJSX(tip.i)}</i>
		if ('u' in tip) return <u>{notesToJSX(tip.u)}</u>
		if ('a' in tip) return <a href={tip.href}>{notesToJSX(tip.a)}</a>
		console.warn('unknown element type in notes: ', tip)
		return <span>{notesToJSX(tip.a)}</span>
	}
	if (!tips) return null
	if (typeof tips === 'string') return processString(tips)
	if (Array.isArray(tips))
		return tips.map(tip => {
			return typeof tip === 'string' ? processString(tip) : processObj(tip)
		})
	return processObj(tips)
}
const ARTIFACT_CODES = ['circlet', 'goblet', 'sands']
export function CharacterBuildDetailed({ characterCode }: { characterCode: string }) {
	const build = useFetch(sig => apiGetCharacterFullInfo(characterCode, sig), [characterCode])
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
		// TODO: role.weapons.notes, role.weapons.seeCharNotes
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
										: ` (${item.stacks} ${pluralizeEN(
												item.stacks,
												'stack',
												'stacks',
										  )})`) +
									genNotes(item) +
									genSeeCharNotes(item)
								}
								rarity={weapon.rarity}
								classes={`small-avatar small ${!isInList || isLastInList ? 'mb-1' : ''}`}
							/>
							{isInList && !isLastInList && (
								<div className="text-center text-muted small ">or</div>
							)}
						</>
					)
				})}
			</li>
		))
	}, [build, selectedRoleTab])
	const artifactStatsAndSkillsBlock = useMemo(() => {
		if (!isLoaded(build)) return null
		const role = getRoleData(build, selectedRoleTab)
		return (
			<>
				<h6 className="text-uppercase opacity-75">Main artifact stats</h6>
				<ul className="mb-1 list-unstyled ms-1">
					{ARTIFACT_CODES.map(ac => (
						<li>
							<ItemAvatar
								src={getArtifactTypeIconSrc(ac)}
								rarity={3}
								classes="small-avatar small mb-1 me-1 mb-xxl-2 me-xxl-2 p-1"
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
					{role.subStats.notes} {genSeeCharNotes(role.subStats)}
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
								<ol className="items-list">{weaponListBlock}</ol>
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
					<ol className="items-list">{weaponListBlock}</ol>
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
