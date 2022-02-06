import './farm-today.scss'
import { useMemo } from 'preact/hooks'

import { getRegionTime, GI_ROTATION_WEEKDAY_CODES } from '#lib/genshin'
import { arrGetAfter } from '#lib/utils/collections'
import { apiMaterialsTimetable } from '#src/api/generated'
import Spinner from '#src/components/spinners'
import { BtnTabGroup, Tabs, useSelectable } from '#src/components/tabs'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { isLoaded, useFetch, useLocalStorage } from '#src/utils/hooks'
import { getItemIconSrc } from '#src/utils/items'
import { HEART } from '#src/utils/typography'
import { ItemAvatar } from './item-cards/item-avatars'
import {
	SK_FAV_CHAR_CODES,
	SK_FAV_TALENT_MATERIAL_CODES,
	SK_FAV_WEAPON_PRIMARY_MATERIAL_CODES,
} from '#src/modules/builds/common'

export function FarmToday({ classes = '' }: { classes?: string }): JSX.Element {
	const ttData = useFetch(apiMaterialsTimetable, [])
	const { weekdayCode } = getRegionTime('europe')
	const tomorrowCode = arrGetAfter(GI_ROTATION_WEEKDAY_CODES, weekdayCode)
	const [favCharCodes] = useLocalStorage<string[]>(SK_FAV_CHAR_CODES, [])
	const [favTalMaterialCodes] = useLocalStorage<string[]>(SK_FAV_TALENT_MATERIAL_CODES, [])
	// const [favWeaponDatas] = useLocalStorage<STORAGE_WEAPON_DATA[]>(SK_FAV_WEAPON_DATAS, [])
	// const favWeapMatCodes = useMemo(() => [...favWeaponDatas.map(wd => wd[1])], [favWeaponDatas])
	const [favWeapPrimMatCodes] = useLocalStorage<string[]>(SK_FAV_WEAPON_PRIMARY_MATERIAL_CODES, [])

	console.log(weekdayCode, tomorrowCode, isLoaded(ttData) ? ttData.timetable[weekdayCode] : null)
	const tabs = useMemo(
		() => [
			{ code: weekdayCode, title: 'today' },
			{ code: tomorrowCode, title: 'tomorrow' },
		],
		[weekdayCode, tomorrowCode],
	)
	const [selectedTab, setSelectedTab] = useSelectable(tabs)

	return (
		<div className={`farm-today ${classes}`}>
			<div className="d-none d-xl-flex">
				<h5 className="py-2 m-0 me-2 d-block ">Dungeons</h5>
				<Tabs
					tabs={tabs}
					selectedTab={selectedTab}
					onTabSelect={setSelectedTab}
					classes="mb-2 flex-grow-1"
				/>
			</div>
			<div className="d-block d-xl-none">
				<BtnTabGroup
					tabs={tabs}
					selectedTab={selectedTab}
					onTabSelect={setSelectedTab}
					classes="w-100 mb-2"
				/>
			</div>
			{isLoaded(ttData) ? (
				<>
					<h6 className="opacity-75 text-capitalize">Talents</h6>
					<div className="talents-wrap">
						{ttData.timetable[selectedTab.code].characterAscensions.map(asc => (
							<>
								<div className="mb-3 ps-2 ms-1 d-flex align-items-center" key={asc.itemCode}>
									<div>
										<ItemAvatar
											src={getItemIconSrc(asc.itemCode)}
											classes="me-3 vertical-align-middle"
											badge={
												~favTalMaterialCodes.indexOf(asc.itemCode) ? (
													<span className="text-danger">{HEART}</span>
												) : null
											}
										/>
									</div>
									<div className="d-flex flex-nowrap">
										{asc.characterCodes.map(c => (
											<ItemAvatar
												key={c}
												src={getCharacterAvatarSrc(c)}
												classes={`small-avatar my-2 me-2 ${
													~favCharCodes.indexOf(c) ? 'order-1' : 'order-2'
												}`}
												badge={
													~favCharCodes.indexOf(c) ? (
														<span className="text-danger">{HEART}</span>
													) : null
												}
											/>
										))}
									</div>
								</div>
							</>
						))}
					</div>
					<h6 class="opacity-75 text-capitalize">Weapons</h6>
					<div className="ps-2 ms-1">
						{ttData.timetable[selectedTab.code].weaponMaterialCodes.map(code => (
							<ItemAvatar
								key={code}
								src={getItemIconSrc(code)}
								classes="small-avatar me-3"
								badge={
									~favWeapPrimMatCodes.indexOf(code) ? (
										<span className="text-danger">{HEART}</span>
									) : null
								}
							/>
						))}
					</div>
				</>
			) : (
				<Spinner />
			)}
			<div className="text-muted small text-center px-2 mx-1 py-3">
				Add characters, weapons or items to your favorites to see them here.
			</div>
		</div>
	)
}
