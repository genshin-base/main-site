import { useMemo, useState } from 'preact/hooks'

import { CharacterBuildInfoRole } from '#src/../../lib/parsing/helperteam/characters'
import { isLoaded, useFetch } from '#src/api/hooks'
import { CharacterPortrait } from '#src/components/characters'
import { BtnTabGroup, Tab, Tabs } from '#src/components/tabs'
import { LabeledItemAvatar } from '#src/containers/item-cards/item-cards'
import { apiGetCharacterFullInfo } from '#src/generated'
import { makeCharacterBuildDeselectHash } from '#src/hashstore'
import character_Sangonomiya_Kokomi_Portrait from '#src/media/Character_Sangonomiya_Kokomi_Portrait.png'
import { pluralizeEN } from '#src/utils/strings'
import { getWeaponIconSrc } from '#src/utils/weapons'

import './character-build-detailed.scss'

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

export function CharacterBuildDetailed({ selectedCharacterCode }: { selectedCharacterCode: string }) {
	const build = useFetch(
		sig => apiGetCharacterFullInfo(selectedCharacterCode, sig),
		[selectedCharacterCode],
	)

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

	const weaponList = useMemo(() => {
		if (!isLoaded(build)) return []
		const role = build.character.roles.find(x => x.code === selectedRoleTab.code)
		if (!role) return []
		// TODO: role.weapons.notes, role.weapons.seeCharNotes
		// TODO: rarity
		return role.weapons.advices.map((advice, i) => (
			<li key={i} className="m-2 ms-0">
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
								(item.notes === null ? '' : JSON.stringify(item.notes)) +
								(item.seeCharNotes ? ' (see notes)' : '')
							}
							rarity={4}
							classes={'small'}
						/>
					)
				})}
			</li>
		))
	}, [build, selectedRoleTab])

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
						<CharacterPortrait src={character_Sangonomiya_Kokomi_Portrait} classes="w-100" />
					</div>
					<div className="col col-9">
						<div className="d-flex">
							<div className="flex-fill w-33 p-3">
								<h6 className="text-uppercase opacity-75">Weapon</h6>
								<ol>{weaponList}</ol>
							</div>
							<div className="flex-fill w-33 p-3">
								<h6 className="text-uppercase opacity-75">Artifacts</h6>
								<ol>{weaponList}</ol>
								<div></div>
							</div>
							<div className="flex-fill w-33 p-3">
								<h6 className="text-uppercase opacity-75">Talent Priority</h6>
								<ol>{talentPriority}</ol>
								<div className="opacity-75">{talentTips}</div>
							</div>
						</div>
					</div>
				</div>
				<div className="row">
					<div className="col col-3"></div>
					<div className="col col-9">
						<div className="p-3">
							<h6 className="text-uppercase opacity-75">Notes</h6>
							<div className="opacity-75">{notes}</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
	const CharacterDetailMobile = (
		<div class="d-xl-none">
			<CharacterPortrait
				src={character_Sangonomiya_Kokomi_Portrait}
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
					<ol>{weaponList}</ol>
					<div></div>
				</div>
				<div className="my-3">
					<h6 className="text-uppercase opacity-75">Talent Priority</h6>
					<ol>{talentPriority}</ol>
					<div className="opacity-75">{talentTips}</div>
				</div>
				<div className="my-3">
					<h6 className="text-uppercase opacity-75">Weapon</h6>
					<ol>{weaponList}</ol>
				</div>
			</div>
			<div>
				<h6 className="text-uppercase opacity-75">Notes</h6>
				<div className="opacity-75">{notes}</div>
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
