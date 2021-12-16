import './character-build-detailed.scss'
import character_Sangonomiya_Kokomi_Portrait from 'src/media/Character_Sangonomiya_Kokomi_Portrait.png'
import weaponIcon from 'src/media/Weapon_Song_of_Broken_Pines.png'
import { CharacterPortrait } from 'src/components/characters'
import { Tabs, BtnTabGroup } from 'src/components/tabs'
import { LabeledItemAvatar } from 'src/containers/item-cards'

// todo remove
const roles = [
	{ code: 'dps', isRecomended: true },
	{ code: 'support', isRecomended: false },
	{ code: 'burst-dps', isRecomended: false },
]
const tabs = roles.map(r => {
	return {
		code: r.code,
		title: (
			<span key={r.code}>
				{r.isRecomended ? (
					<span className="fs-4 lh-1 opacity-75 text-warning align-bottom">🟊</span>
				) : null}
				{r.code}
			</span>
		),
	}
})
const selectedTab = tabs[0]

const weapons: { rarity: 3 | 4 | 5; code: string; imgScr: string }[] = [
	{ code: 'лещ', rarity: 5, imgScr: weaponIcon },
	{ code: 'меч неч', rarity: 4, imgScr: weaponIcon },
	{ code: 'меч с длинным инадзумским названием', rarity: 4, imgScr: weaponIcon },
	{ code: 'лещ, но плохой', rarity: 3, imgScr: weaponIcon },
]
const weaponList = weapons.map(w => (
	<li key={w.code} className="m-2 ms-0">
		<LabeledItemAvatar imgSrc={w.imgScr} title={w.code} rarity={w.rarity} classes={'small'} />
	</li>
))
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

export function CharacterBuildDetailed({
	selectedCharacter,
	handleGoBack,
}: {
	selectedCharacter: unknown
	handleGoBack: () => void
}) {
	const CharacterDetailDesktop = (
		<div className="d-none d-xl-block">
			<div className="container float-end">
				<div className="row">
					<div className="col col-3"></div>
					<div className="col col-9">
						<Tabs
							tabs={tabs}
							selectedTab={selectedTab}
							onTabSelect={t => {
								t
							}}
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
				tabs={tabs}
				selectedTab={selectedTab}
				onTabSelect={t => {
					t
				}}
				classes="w-100 my-3"
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
				<button className="btn btn-secondary align-baseline" type="submit" onClick={handleGoBack}>
					<span className="fs-4 lh-1 opacity-75">‹ </span> Back
				</button>
				<h5 className="px-3 d-inline align-baseline">Sangonomiya Kokomi </h5>
			</div>
			{CharacterDetailDesktop}
			{CharacterDetailMobile}
		</div>
	)
}
