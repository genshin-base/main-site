import { useMemo } from 'preact/hooks'

import { getRegionTime, GI_ROTATION_WEEKDAY_CODES } from '#lib/genshin'
import { arrGetAfter } from '#lib/utils/collections'
import { mustBeDefined } from '#src/../../lib/utils/values'
import { apiMaterialsTimetable } from '#src/api/endpoints'
import { Spinner } from '#src/components/placeholders'
import { BtnTabGroup, Tabs, useSelectable } from '#src/components/tabs'
import {
	I18N_DUNGEONS,
	I18N_TALENTS,
	I18N_TODAY,
	I18N_TOMORROW,
	I18N_WEAPONS,
	I18N_WEEKDAYS,
	I18N_WHY_ADD_TO_FAVS_TIP,
} from '#src/i18n/i18n'
import { isLoaded, useFetch, useForceUpdate, useVersionedStorage, useVisibleTicker } from '#src/utils/hooks'
import { getItemIconLargeSrc, getItemIconSrc } from '#src/utils/items'
import {
	SV_FAV_CHAR_CODES,
	SV_FAV_TALENT_MATERIAL_CODES,
	SV_FAV_WEAPON_PRIMARY_MATERIAL_CODES,
	SV_SELECTED_REGION_CODE,
} from '#src/utils/local-storage-keys'
import { BULLET, HEART } from '#src/utils/typography'
import { OtherItemCard } from './item-cards/dd-cards'
import { CharacterAvatar, ItemAvatar } from './item-cards/item-avatars'

import './farm-today.scss'

export function FarmToday({ classes = '' }: { classes?: string }): JSX.Element {
	const ttData = useFetch(apiMaterialsTimetable, [])
	const [selectedRegionCode] = useVersionedStorage(SV_SELECTED_REGION_CODE)
	const { weekdayMonSun, weekdayCode } = getRegionTime(selectedRegionCode)
	const tomorrowCode = arrGetAfter(GI_ROTATION_WEEKDAY_CODES, weekdayCode)
	const [favCharCodes] = useVersionedStorage(SV_FAV_CHAR_CODES)
	const [favTalMaterialCodes] = useVersionedStorage(SV_FAV_TALENT_MATERIAL_CODES)
	// const [favWeaponDatas] = useLocalStorage<STORAGE_WEAPON_DATA[]>(SK_FAV_WEAPON_DATAS, [])
	// const favWeapMatCodes = useMemo(() => [...favWeaponDatas.map(wd => wd[1])], [favWeaponDatas])
	const [favWeapPrimMatCodes] = useVersionedStorage(SV_FAV_WEAPON_PRIMARY_MATERIAL_CODES)
	const forceUpdate = useForceUpdate()
	useVisibleTicker(() => {
		forceUpdate()
	}, 60 * 1000)
	const tabs = useMemo(
		() => [
			{
				code: weekdayCode,
				title: `${I18N_WEEKDAYS[weekdayMonSun]}, ${I18N_TODAY}`,
			},
			{ code: tomorrowCode, title: I18N_TOMORROW },
		],
		[weekdayCode, tomorrowCode, weekdayMonSun],
	)
	const [selectedTab, setSelectedTab] = useSelectable(tabs, [selectedRegionCode])

	return (
		<div className={`farm-today ${classes}`}>
			{!BUNDLE_ENV.IS_SSR && (
				<>
					<div className="d-none d-xl-flex">
						<h5 className="py-2 m-0 me-2 d-block ">{I18N_DUNGEONS}</h5>
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
							classes="w-100 mb-2 btn-group-sm"
						/>
					</div>
				</>
			)}
			{isLoaded(ttData) && !BUNDLE_ENV.IS_SSR ? (
				<>
					<h6 className="opacity-75 text-capitalize">{I18N_TALENTS}</h6>
					<div className="talents-wrap pt-1">
						{ttData.timetable[selectedTab.code].characterAscensions.map(asc => (
							<>
								<div className="mb-3 ps-2 ms-1 d-flex align-items-center" key={asc.itemCode}>
									<div>
										<ItemAvatar
											src={getItemIconLargeSrc(asc.itemCode)}
											classes="me-2 vertical-align-middle"
											badgeTopStart={
												~favTalMaterialCodes.indexOf(asc.itemCode) ? (
													<span className="text-danger opacity-75">{HEART}</span>
												) : null
											}
											ddComponent={
												<OtherItemCard
													item={mustBeDefined(
														ttData.items.find(i => i.code === asc.itemCode),
													)}
													related={ttData.maps}
												/>
											}
										/>
									</div>
									<div
										// for PurgeCSS: color-sumeru color-inazuma color-liyue color-mondstadt
										className={`color-${asc.itemRegion} me-1 fs-1 position-relative`}
										style={{ lineHeight: 0, top: '-4px' }}
									>
										{BULLET}
									</div>
									<div className="d-flex flex-wrap align-self-center pt-2">
										{asc.characterCodes.map(c => (
											<CharacterAvatar
												key={c}
												code={c}
												href={'/builds/' + c}
												classes={`small-avatar mb-2 me-2 ${
													~favCharCodes.indexOf(c) ? 'order-1' : 'order-2'
												}`}
												badgeTopStart={
													~favCharCodes.indexOf(c) ? (
														<span className="text-danger opacity-75">
															{HEART}
														</span>
													) : null
												}
											/>
										))}
									</div>
								</div>
							</>
						))}
					</div>
					<h6 class="opacity-75 text-capitalize">{I18N_WEAPONS}</h6>
					<div className="ps-2 ms-1">
						{ttData.timetable[selectedTab.code].weaponMaterialCodes.map(code => (
							<ItemAvatar
								key={code}
								src={getItemIconSrc(code)}
								classes="small-avatar me-2 mb-2 with-padding"
								badgeTopStart={
									~favWeapPrimMatCodes.indexOf(code) ? (
										<span className="text-danger opacity-75">{HEART}</span>
									) : null
								}
								ddComponent={
									<OtherItemCard
										item={mustBeDefined(ttData.items.find(i => i.code === code))}
										related={ttData.maps}
									/>
								}
							/>
						))}
					</div>
				</>
			) : (
				<Spinner />
			)}
			<div className="text-muted small text-center px-2 mx-1 py-3">{I18N_WHY_ADD_TO_FAVS_TIP}</div>
		</div>
	)
}
