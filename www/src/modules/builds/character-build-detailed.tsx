import { useEffect, useMemo, useState } from 'preact/hooks'

import { CharacterBuildInfoRole } from '#src/../../lib/parsing/helperteam/characters'
import { isLoaded, useFetch } from '#src/api/hooks'
import { CharacterPortrait } from '#src/components/characters'
import { BtnTabGroup, Tab, Tabs } from '#src/components/tabs'
import { LabeledItemAvatar } from '#src/containers/item-cards/item-cards'
import { apiGetCharacterFullInfo } from '#src/generated'
import { makeCharacterBuildDeselectHash } from '#src/hashstore'
import { getCharacterPortraitSrc, getCharacterSilhouetteSrc } from '#src/utils/characters'
import { pluralizeEN } from '#src/utils/strings'
import { getWeaponIconSrc } from '#src/utils/weapons'

import './character-build-detailed.scss'
import Spinner from '#src/components/spinners'

// todo remove

const talentPriority = (
	<>
		<li>Normal Attack</li> <li>Skill</li> <li>Burst</li>
	</>
)
const talentTips = (
	<>
		<p>See here for more specifics regarding the weapon rankings.</p>
		<p>Courtesy of paraszcazk#0148</p>
		<p>Due to how Polar Star works, your optimal rotation would be different from other weapons:</p>
		<p>Skill (Burst) &gt; NA &gt; CA &gt; Resummon Oz (To snapshot Polar Star stacks)</p>
	</>
)
const notes = (
	<>
		<p>
			Elemental Burst and Skill both summon Oz, so make sure you're only using one at a time. Start with
			your Skill, use Burst for second Oz rotation and alternate. Hopefully, by the time your
			second/third round of Oz summoning is over, you'll have gained enough energy to repeat the loop.
		</p>
		<p>
			Regarding Weapon Choices: The Stringless and Alley Hunter: At [R5], both these weapons are roughly
			equivalent to Thundering Pulse and Skyward Harp. Prototype Crescent: Ranking assumes hitting
			enemy's weak spot with Charged Shot everytime before summoning Oz, if you use this weapon without
			shooting enemy's weak spots for the buff, it will have the same ranking as Rust. Windblume Ode:
			Ode only performs this well if Fischl ends up being the trigger for some reactions. If Fischl is
			used in a team comp where by there are NO ELEMENTAL REACTIONS, this weapon will be ranked below
			Mitternachts Waltz. Mitternachts Waltz: This weapon will be ranked above Windblume Ode at [R5].
		</p>
		<p>
			Regarding Artifact Sets: Thundersoothers (4): This artifact set will outperform Gladiator's
			Finale(2) Thundering Fury(2) if used in a team comp where an electro aura is always present (e.g.
			Electro/Electro-charged comps) therefore it is highly recommended within this niche. Gambler (2)
			Thundering Fury (2): Similar to Albedo and Defender's Will, since Gambler artifact set only goes
			up to 4 star quality, you should only use them in the Feather and Flower slot such that you do not
			lose out as much on offensive mainstats. Tenacity of the Millelith (4): Works as a low/no
			investment Fischl build. This set trades off Fischl's damage in return for a party wide 20 ATK%
			buff. Not recommended to specifically farm this set for Fischl. Only use this set if you have
			pieces while farming for the Pale Flame set for your Physical DPSes.
		</p>
	</>
)
// end todo remove

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
		if ('b' in tip) return <span className="text-primary">{notesToJSX(tip.b)}</span>
		if ('i' in tip) return <i>{notesToJSX(tip.i)}</i>
		if ('a' in tip) return <a href={tip.href}>{notesToJSX(tip.a)}</a>
		console.warn('unknown element type in notes')
		return <span>{notesToJSX(tip.a)}</span>
	}
	if (!tips) return null
	if (typeof tips === 'string') return processString(tips)
	return tips.map(tip => {
		return typeof tip === 'string' ? processString(tip) : processObj(tip)
	})
}
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
				{advice.similar.map(item => {
					const weapon = build.weapons.find(x => x.code === item.code)
					if (!weapon) return null
					return (
						<LabeledItemAvatar
							imgSrc={getWeaponIconSrc(weapon.code)}
							title={
								weapon.name +
								(item.refine === null ? '' : ` [${item.refine}]`) +
								(item.stacks === null
									? ''
									: ` (${item.stacks} ${pluralizeEN(item.stacks, 'stack', 'stacks')})`) +
								genNotes(item) +
								genSeeCharNotes(item)
							}
							rarity={weapon.rarity}
							classes={'small mb-1'}
						/>
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
				<ul className="mb-1">
					<li>
						<b className="text-muted">circlet — </b>
						{genArtMainStatDetail(role, 'circlet')}
					</li>
					<li>
						<b className="text-muted">goblet — </b>
						{genArtMainStatDetail(role, 'goblet')}
					</li>
					<li>
						<b className="text-muted">sands — </b>
						{genArtMainStatDetail(role, 'sands')}
					</li>
				</ul>
				<div className="opacity-75">
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
				<div className="opacity-75">
					{role.subStats.notes} {genSeeCharNotes(role.subStats)}
				</div>
				<h6 className="text-uppercase opacity-75 mt-3">Talent Priority</h6>
				<ol>
					{role.talents.advices.map(advice => {
						return <li>{advice}</li>
					})}
				</ol>
				<div className="opacity-75">
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
							<div className="opacity-75">{notesBlock}</div>
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
