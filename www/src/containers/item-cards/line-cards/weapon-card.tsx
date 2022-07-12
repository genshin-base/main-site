import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'

import { ItemShortInfo, WeaponRegularInfo } from '#lib/parsing/combine'
import { apiGetWeapon } from '#src/api/endpoints'
import { getAllRelated } from '#src/api/utils'
import { Accordion } from '#src/components/accordion'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import { CentredSpinner, Spinner } from '#src/components/placeholders'
import {
	I18N_ASC_MATERIALS,
	I18N_BASE_ATTACK,
	I18N_COLLAPSE,
	I18N_ITEM_STORY,
	I18N_MAIN_INFO,
	I18N_STAT_NAME,
	I18N_WEAPON_OBTAIN_SOURCE_NAME,
} from '#src/i18n/i18n'
import { notesToJSX } from '#src/modules/builds/common'
import { genEquipmentHash, WEAPON_ROW_CARD_HASH_KEY } from '#src/modules/equipment/common'
import { isLoaded, useFetch, useHashValue, useScrollTo } from '#src/utils/hooks'
import { getItemIconSrc } from '#src/utils/items'
import { BULLET, DASH, ELLIPSIS } from '#src/utils/typography'
import { getWeaponIconLageSrc } from '#src/utils/weapons'
import { addMarkerGroupsByDomains, addMarkerGroupsByEnemies, CardMap, CardMapMarkerGroup } from '../card-map'
import { AscMaterials, RecommendedTo } from '../common'
import { ItemAvatar } from '../item-avatars'

import './line-cards.scss'

type WeaponRowProps = {
	weapon: WeaponRegularInfo
	group: number
	isExpanded: boolean
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
	const [materialOnMap, setMaterialOnMap] = useState<ItemShortInfo | undefined>()
	const dataForMap = useMemo(() => {
		if (!isLoaded(weaponFull) || !materialOnMap) return { markerGroups: dummyMarkerGroups }
		const srcs = materialOnMap.obtainSources
		const markerGroups: CardMapMarkerGroup[] = []
		addMarkerGroupsByDomains(markerGroups, getAllRelated(weaponFull.maps.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(weaponFull.maps.enemies, srcs.enemyCodes))
		return {
			itemData: {
				item: materialOnMap,
				imgSrc: getItemIconSrc(materialOnMap.code),
			},
			markerGroups,
		}
	}, [weaponFull, materialOnMap])

	const materials = useMemo(() => {
		if (!isLoaded(weaponFull)) return []
		return getAllRelated(weaponFull.maps.items, weaponFull.weapon.materialCodes)
	}, [weaponFull])

	useEffect(() => {
		setMaterialOnMap(materials[0])
	}, [materials])

	const mainInfoColInner = useMemo(() => {
		return (
			<>
				<div>
					<ItemAvatar
						classes="mb-2 me-2 large-avatar float-start"
						rarity={weapon.rarity}
						src={getWeaponIconLageSrc(weapon.code)}
					/>
					<h4 className="mb-0">{weapon.name}</h4>
					<div className="overflow-hidden">
						<span className="mb-2 text-muted">
							{BULLET} {weapon.obtainSources.map(I18N_WEAPON_OBTAIN_SOURCE_NAME).join(', ')}
						</span>
					</div>
				</div>
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
				<div className="mt-1">
					<RecommendedTo
						isInline={true}
						navigateToCharacter={true}
						isAvatarWithBorder={true}
						charCodes={weapon.recommendedTo}
					/>
				</div>
				<div className="flex-fill overflow-auto small lh-sm">{weapon.passiveStat}</div>
			</>
		)
	}, [weapon])
	const loreInfoColInner = useMemo(() => {
		return (
			<>
				<div className="opacity-75">{I18N_ITEM_STORY}</div>
				{isLoaded(weaponFull) ? (
					<>
						<div className="fst-italic my-1 small lh-sm text-muted">
							{weaponFull.weapon.description}
						</div>
						<div className="flex-fill my-1 overflow-auto small lh-sm opacity-75">
							{notesToJSX(weaponFull.weapon.story)}
						</div>
					</>
				) : (
					<Spinner />
				)}
			</>
		)
	}, [weaponFull])
	const locationColInner = useMemo(() => {
		return (
			<div className="d-flex flex-fill flex-column location-col-inner position-relative">
				{dataForMap.markerGroups === dummyMarkerGroups ? (
					<CentredSpinner />
				) : (
					<>
						<div>
							<AscMaterials
								materials={materials}
								selectedMat={materialOnMap}
								onMatSelect={setMaterialOnMap}
							/>
						</div>
						<div className="flex-fill">
							<CardMap isFatHead={true} isItemFavable={true} {...dataForMap} classes="h-100" />
						</div>
					</>
				)}
			</div>
		)
	}, [dataForMap, materials, materialOnMap])

	const cellClass = 'w-33 d-flex px-2 pb-3 pt-2 flex-column'
	const forAccordion = useMemo(() => {
		return [
			{
				title: `${weapon.name} ${BULLET} ${I18N_MAIN_INFO}`,
				code: 'mainInfoColInner',
				content: mainInfoColInner,
			},
			{ title: I18N_ITEM_STORY, code: 'loreInfoColInner', content: loreInfoColInner },
			{ title: I18N_ASC_MATERIALS, code: 'locationColInner', content: locationColInner },
		]
	}, [mainInfoColInner, loreInfoColInner, locationColInner, weapon])
	return (
		<MobileDesktopSwitch
			childrenDesktop={
				<div className="bg-dark-darker rounded-start border border-secondary d-flex w-100 line-card-desktop">
					<div className={cellClass}>{mainInfoColInner}</div>
					<div className={cellClass}>
						<div className="invisible pe-none">
							{/* to make the same padding-top as on the next cell */}
							<button
								type="button"
								className="btn-close btn-sm ms-auto "
								aria-label="Close"
							></button>
						</div>
						{loreInfoColInner}
					</div>
					<div className={cellClass}>
						<button
							type="button"
							className="btn-close btn-sm ms-auto"
							aria-label="Close"
							onClick={onClose}
						></button>
						{locationColInner}
					</div>
				</div>
			}
			childrenMobile={
				<>
					<div
						className="ms-auto d-flex justify-content-end align-items-center mb-2 me-3"
						onClick={onClose}
					>
						<label className="small text-muted c-pointer">{I18N_COLLAPSE}</label>
						<button
							type="button"
							className="btn-close btn-sm d-inline-block ms-1"
							aria-label="Close"
						></button>
					</div>
					<div className="bg-dark rounded border overflow-hidden border-secondary d-flex w-100 line-card-mobile">
						<Accordion
							classes="accordion-flush w-100"
							items={forAccordion}
							expandedItemCode={forAccordion[0].code}
						/>
					</div>
				</>
			}
		/>
	)
}
export function WeaponCardTableRow({ weapon, isExpanded, group }: WeaponRowProps): JSX.Element {
	const [, setSelectedWeaponCode] = useHashValue<string | null>(WEAPON_ROW_CARD_HASH_KEY, null)

	const toggleExpand = useCallback(() => {
		isExpanded ? setSelectedWeaponCode(null) : setSelectedWeaponCode(weapon.code)
	}, [isExpanded, setSelectedWeaponCode, weapon.code])

	const [cardRef] = useScrollTo<HTMLTableCellElement>(isExpanded)
	const bgClass = group === 1 ? 'bg-dark' : 'bg-dark-darker'

	const expandedRow = useMemo(() => {
		return (
			<>
				<tr>
					<td colSpan={6} className="p-2" ref={cardRef}>
						<WeaponCardLine weapon={weapon} onClose={toggleExpand} />
					</td>
				</tr>
			</>
		)
	}, [weapon, toggleExpand, cardRef])
	const collapsededRow = useMemo(() => {
		return (
			<>
				<tr className={'small lh-sm ' + bgClass}>
					<td colSpan={1}>
						<div className="d-flex c-pointer" onClick={toggleExpand}>
							<ItemAvatar
								classes="me-2 small-avatar align-self-center flex-shrink-0"
								rarity={weapon.rarity}
								src={getWeaponIconLageSrc(weapon.code)}
							/>
							<a
								href={genEquipmentHash('weapon', weapon.code)}
								className="align-self-center text-decoration-underline-dotted"
							>
								{weapon.name}
							</a>
						</div>
					</td>
					<td>
						{weapon.atk.base} / {weapon.atk.max}
					</td>
					<td>
						{weapon.subStat ? (
							<>
								{I18N_STAT_NAME(weapon.subStat.code)} <br />
								{`${weapon.subStat.base} / ${weapon.subStat.max}`}
							</>
						) : (
							DASH
						)}
					</td>
					<MobileDesktopSwitch
						childrenDesktop={
							<td className="opacity-75">{weapon.passiveStat ? weapon.passiveStat : DASH}</td>
						}
						childrenMobile={null}
					/>
					<td>
						<div className="c-pointer" onClick={toggleExpand}>
							<button className="btn">
								<span className="btn-expand-inner"></span>
							</button>
						</div>
					</td>
				</tr>
			</>
		)
	}, [weapon, toggleExpand, bgClass])
	return isExpanded ? expandedRow : collapsededRow
}
