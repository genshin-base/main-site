import { useMemo } from 'preact/hooks'

import { getRegionTime, GI_ROTATION_WEEKDAY_CODES } from '#lib/genshin'
import { arrGetAfter } from '#lib/utils/collections'
import { apiMaterialsTimetable } from '#src/api/generated'
import { BtnTabGroup, Tabs, useSelectedable } from '#src/components/tabs'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { isLoaded, useFetch } from '#src/utils/hooks'
import { getItemIconSrc } from '#src/utils/items'
import { ItemAvatar } from './item-cards/item-cards'

export function FarmToday({ classes = '' }: { classes?: string }): JSX.Element {
	const ttData = useFetch(apiMaterialsTimetable, [])
	const { weekdayCode } = getRegionTime('europe')
	const tomorrowCode = arrGetAfter(GI_ROTATION_WEEKDAY_CODES, weekdayCode)

	console.log(weekdayCode, tomorrowCode, isLoaded(ttData) ? ttData.timetable[weekdayCode] : null)

	const tabs = useMemo(
		() => [
			{ code: weekdayCode, title: 'today' },
			{ code: tomorrowCode, title: 'tomorrow' },
		],
		[weekdayCode, tomorrowCode],
	)
	const [selectedTab, setSelectedTab] = useSelectedable(tabs)

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
			{isLoaded(ttData) &&
				ttData.timetable[selectedTab.code].characterAscensions.map(asc => (
					<div className="mb-3 ps-2 ms-1" key={asc.itemCode}>
						<ItemAvatar src={getItemIconSrc(asc.itemCode)} classes="me-3 vertical-align-middle" />
						{asc.characterCodes.map(c => (
							<ItemAvatar key={c} src={getCharacterAvatarSrc(c)} classes="small-avatar me-2" />
						))}
					</div>
				))}
			<h6 class="opacity-75">Weapons</h6>
			<div className="ps-2 ms-1">
				{isLoaded(ttData) &&
					ttData.timetable[selectedTab.code].weaponMaterialCodes.map(code => (
						<ItemAvatar key={code} src={getItemIconSrc(code)} classes="small-avatar me-3" />
					))}
			</div>
			<div className="text-muted small text-center px-2 mx-1 py-3">
				Add characters, weapons or items to your favorites to see them here.
			</div>
		</div>
	)
}
