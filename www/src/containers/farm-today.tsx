import { BtnTabGroup, Tabs } from '#src/components/tabs'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { getItemIconSrc } from '#src/utils/items'
import { useState } from 'preact/hooks'
import { ItemAvatar } from './item-cards/item-cards'

export function FarmToday({ classes = '' }: { classes?: string }): JSX.Element {
	const tabs = [
		{ code: '0', title: 'today' },
		{ code: '1', title: 'tomorrow' },
	]
	const [selectedTab, setSelectedTab] = useState(tabs[0])
	const var1 = ['philosophies-of-elegance', 'philosophies-of-resistance', 'philosophies-of-diligence'],
		var2 = ['dream-of-the-dandelion-gladiator', 'narukamis-valor', 'mist-veiled-primo-elixir']
	const talentItemCodes = [var1, var2]
	const weaponItemCodes = [var2, var1]
	const chCodes = ['sucrose', 'xinyan', 'diluc', 'yanfei']
	return (
		<div className={`farm-today ${classes}`}>
			<div className="d-none d-xl-block">
				<Tabs tabs={tabs} selectedTab={selectedTab} onTabSelect={setSelectedTab} classes="mb-2" />
			</div>
			<div className="d-block d-xl-none">
				<BtnTabGroup
					tabs={tabs}
					selectedTab={selectedTab}
					onTabSelect={setSelectedTab}
					classes="w-100 mb-2"
				/>
			</div>
			<h6 class="opacity-75">Talents</h6>
			{talentItemCodes[selectedTab.code].map(c => (
				<div className="mb-3 ps-2 ms-1">
					{<ItemAvatar key={c} src={getItemIconSrc(c)} classes="me-3 vertical-align-middle" />}
					{chCodes.map(c => (
						<ItemAvatar key={c} src={getCharacterAvatarSrc(c)} classes="small-avatar me-2" />
					))}
				</div>
			))}
			<h6 class="opacity-75">Weapons</h6>
			<div className="ps-2 ms-1">
				{weaponItemCodes[selectedTab.code].map(c => (
					<ItemAvatar key={c} src={getItemIconSrc(c)} classes="small-avatar me-3" />
				))}
			</div>
			<div className="text-muted small text-center px-2 mx-1 py-3">
				Add characters, weapons or items to your favorites to see them here.
			</div>
		</div>
	)
}
