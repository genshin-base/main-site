import { useCallback, useMemo, useState } from 'preact/hooks'

import { WeaponRegularInfo } from '#lib/parsing/combine'
import { apiGetWeapon } from '#src/api/endpoints'
import { getAllRelated } from '#src/api/utils'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import {
	I18N_BASE_ATTACK,
	I18N_ITEM_STORY,
	I18N_STAT_NAME,
	I18N_WEAPON_OBTAIN_SOURCE_NAME,
} from '#src/i18n/i18n'
import { notesToJSX } from '#src/modules/builds/common'
import { isLoaded, useFetch } from '#src/utils/hooks'
import { BULLET, DASH, ELLIPSIS } from '#src/utils/typography'
import { getWeaponIconLageSrc } from '#src/utils/weapons'
import { addMarkerGroupsByDomains, addMarkerGroupsByEnemies, CardMap, CardMapMarkerGroup } from './card-map'
import { RecommendedTo } from './common'
import { ItemAvatar } from './item-avatars'

type WeaponRowProps = {
	weapon: WeaponRegularInfo
	group: number
	isExpanded?: boolean
}

const dummyMarkerGroups: CardMapMarkerGroup[] = [
	{
		code: '',
		title: ELLIPSIS,
		markers: [{ mapCode: 'teyvat', x: 0, y: 0, icon: '' }],
	},
]

function WeaponCardLine({
	weapon,
	onClose,
}: {
	weapon: WeaponRegularInfo
	onClose: () => unknown
}): JSX.Element {
	const weaponFull = useFetch(sig => apiGetWeapon(weapon.code, sig), [weapon])

	const markerGroups = useMemo(() => {
		if (!isLoaded(weaponFull)) return dummyMarkerGroups
		const items = getAllRelated(weaponFull.maps.items, weaponFull.weapon.materialCodes)
		const srcs = items[0].obtainSources //TODO
		const markerGroups: CardMapMarkerGroup[] = []
		addMarkerGroupsByDomains(markerGroups, getAllRelated(weaponFull.maps.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(weaponFull.maps.enemies, srcs.enemyCodes))
		return markerGroups
	}, [weaponFull])

	const expandedRowStyle = { height: '300px' }
	const cellClass = 'w-33 d-flex px-2 pb-3 pt-2 flex-column'
	return (
		<div className="bg-dark rounded-start border border-secondary d-flex w-100" style={expandedRowStyle}>
			<div className={cellClass}>
				<div>
					<ItemAvatar
						classes="mb-2 me-2 large-avatar float-start"
						rarity={5}
						src={getWeaponIconLageSrc(weapon.code)}
					/>
					<h4 className="mb-0">{weapon.name}</h4>
					<div className="overflow-hidden">
						<span className="mb-2 text-muted">
							{BULLET} {weapon.obtainSources.map(I18N_WEAPON_OBTAIN_SOURCE_NAME).join(', ')}
						</span>
					</div>
				</div>
				{/* {BULLET} {weapon.obtainSources.map(I18N_WEAPON_OBTAIN_SOURCE_NAME).join(', ')} */}
				<div className="d-flex">
					<div className="me-2">
						<div className="opacity-75">{I18N_BASE_ATTACK}</div>
						<div className="mb-2">
							{weapon.atk.base} / {weapon.atk.max}
						</div>
					</div>
					{weapon.subStat && (
						<div className="ms-1">
							<div className="opacity-75">{I18N_STAT_NAME(weapon.subStat.code)}</div>
							<div className="mb-2">
								{weapon.subStat.base} / {weapon.subStat.max}
							</div>
						</div>
					)}
				</div>
				<div>
					<RecommendedTo
						isInline={true}
						navigateToCharacter={true}
						isAvatarWithBorder={true}
						charCodes={weapon.recommendedTo}
					/>
				</div>
				<div className="flex-fill overflow-auto">{weapon.passiveStat}</div>
			</div>
			<div className={cellClass}>
				<div className="opacity-75">{I18N_ITEM_STORY}</div>
				<div>
					<i>TODO:loading {isLoaded(weaponFull) && weaponFull.weapon.description}</i>
				</div>
				<div className="flex-fill overflow-auto">
					TODO:loading {isLoaded(weaponFull) && notesToJSX(weaponFull.weapon.story)}
				</div>
			</div>
			<div className={cellClass}>
				<button
					type="button"
					className="btn-close btn-sm ms-auto "
					aria-label="Close"
					onClick={onClose}
				></button>
				<div>
					{/* <div className="opacity-75">{I18N_ASC_MATERIALS}:</div> */}
					<RecommendedTo
						isInline={true}
						navigateToCharacter={true}
						isAvatarWithBorder={true}
						charCodes={weapon.recommendedTo}
					/>
				</div>
				<div className="flex-fill">
					TODO:loading if markerGroups === dummyMarkerGroups
					<CardMap markerGroups={markerGroups} classes="h-100" />
				</div>
			</div>
		</div>
	)
}

function WeaponCardTableRowDesktop({ weapon, isExpanded = false, group }: WeaponRowProps): JSX.Element {
	const [isExpandedLocal, setIsExpanded] = useState<boolean>(isExpanded)
	const toglleExpand = useCallback(() => {
		setIsExpanded(!isExpandedLocal)
	}, [isExpandedLocal, setIsExpanded])
	const bgClass = group === 1 ? 'bg-dark' : 'bg-secondary'

	const expandedRow = useMemo(() => {
		return (
			<>
				<tr>
					<td colSpan={6} className="p-2">
						<WeaponCardLine weapon={weapon} onClose={toglleExpand} />
					</td>
				</tr>
			</>
		)
	}, [weapon, toglleExpand])
	const collapsededRow = useMemo(() => {
		return (
			<>
				<tr className={bgClass}>
					<td colSpan={1}>{weapon.name}</td>
					<td>
						{weapon.atk.base}/{weapon.atk.max}
					</td>
					<td>{weapon.subStat ? `${weapon.subStat.code}` : DASH}</td>
					<td>{weapon.subStat ? `${weapon.subStat.base}/${weapon.subStat.max}` : DASH}</td>
					<td>{weapon.passiveStat}</td>
					<td>
						<div onClick={toglleExpand}>
							Expand to see recommended characters and Ascension Materials
						</div>
					</td>
				</tr>
			</>
		)
	}, [weapon, toglleExpand, bgClass])
	return isExpandedLocal ? expandedRow : collapsededRow
}
export function WeaponCardTableRow(props: WeaponRowProps): JSX.Element {
	return (
		<MobileDesktopSwitch
			childrenDesktop={<WeaponCardTableRowDesktop {...props} />}
			childrenMobile={<WeaponCardTableRowDesktop {...props} />}
		/>
	)
}
