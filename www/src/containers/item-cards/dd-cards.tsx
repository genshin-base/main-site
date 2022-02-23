import { useMemo, useState } from 'preact/hooks'

import { GI_DomainTypeCode, GI_MAP_CODES, GI_RarityCode, MapCode, MapLocation } from '#lib/genshin'
import { ArtifactFullInfo, ItemShortInfo, WeaponFullInfo } from '#lib/parsing/combine'
import { arrGetAfter } from '#lib/utils/collections'
import { getAllRelated, RelDomainsShort, RelEnemiesShort, RelItemsShort } from '#src/api/utils'
import { BlockHeader } from '#src/components/block-header'
import { SimpleSelect } from '#src/components/select'
import { Spinner } from '#src/components/spinners'
import { BtnTabGroup, tabTitleFromName, useSelectable } from '#src/components/tabs'
import {
	ItemDetailDdMobilePortal,
	ItemDetailDdPortal,
} from '#src/containers/item-cards/item-detail-dd-portal'
import {
	I18N_ALCHEMY_CALC,
	I18N_BASE_ATTACK,
	I18N_ERROR,
	I18N_FOR_NOBODY,
	I18N_MAP_CODES_NAME,
	I18N_OBTAINED_DURING_STORYLINE,
	I18N_PIECE_BONUS,
	I18N_PIECES_BONUS,
	I18N_PINCH_TO_ZOOM,
	I18N_RECOMENDED_FOR,
	I18N_SCROLL_TO_ZOOM,
	I18N_SECONDARY_STAT,
	I18N_SOURCE,
	I18N_STAT_NAME,
	I18N_WEAPON_OBTAIN_SOURCE_NAME,
	I18N_WEAPON_TYPE_NAME,
} from '#src/i18n/i18n'
import {
	notesToJSX,
	ToggleTalentMaterialFav,
	ToggleWeaponPrimaryMaterialFav,
} from '#src/modules/builds/common'
import { getArtifactIconLargeSrc, getArtifactIconSrc } from '#src/utils/artifacts'
import { BS_isBreakpointLessThen } from '#src/utils/bootstrap'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { getDomainIconSrc } from '#src/utils/domains'
import { getEnemyIconSrc } from '#src/utils/enemies'
import { isLoaded, useFetch, useWindowSize } from '#src/utils/hooks'
import { getItemIconSrc } from '#src/utils/items'
import { BULLET, LEFT_POINTING, RIGHT_POINTING, TIMES } from '#src/utils/typography'
import { getWeaponIconLageSrc } from '#src/utils/weapons'
import { AlchemyCalculator } from '../alchemy-calculator'
import { DdContext, ItemAvatar, LabeledItemAvatar } from './item-avatars'

import type { MapMarkerRaw } from '#src/components/teyvat-map'
const LazyTeyvatMap = import('#src/components/teyvat-map')

export function getRarityBorder(r: GI_RarityCode): string {
	return r === 5 ? 'border-warning' : 'border-light'
}

function RecommendedFor({ charCodes }: { charCodes: string[] }): JSX.Element {
	return (
		<>
			<BlockHeader>{I18N_RECOMENDED_FOR}</BlockHeader>
			{charCodes.length
				? charCodes.map(c => (
						<ItemAvatar
							src={getCharacterAvatarSrc(c)}
							classes={`small-avatar mb-2 me-2 border ${getRarityBorder(4)}`}
						/>
				  ))
				: I18N_FOR_NOBODY}
		</>
	)
}

//переключалка для мобильного и десктопного вида
export function CardDescMobileWrap({
	children,
	targetEl,
	onClickAway,
}: {
	onClickAway: () => void
	targetEl: HTMLElement | null | undefined
	children: JSX.Element
}): JSX.Element {
	const windowSize = useWindowSize()
	return BS_isBreakpointLessThen(windowSize.breakpoint, 'xl') ? (
		<ItemDetailDdMobilePortal onClickAway={onClickAway}>{children}</ItemDetailDdMobilePortal>
	) : (
		<ItemDetailDdPortal onClickAway={onClickAway} targetEl={targetEl}>
			{children}
		</ItemDetailDdPortal>
	)
}
// основной макет карточек
function Card({
	classes = '',
	titleEl,
	selectorEl,
	bodyEl,
	mapEl,
}: {
	classes?: string
	titleEl: JSX.Nodes | string
	selectorEl?: JSX.Nodes
	bodyEl?: JSX.Nodes
	mapEl?: JSX.Nodes
}): JSX.Element {
	return (
		<div className={`item-detail-popover-card card ${classes}`}>
			<h3 className="card-header fs-4 d-flex">
				<span className="flex-fill">{titleEl}</span>{' '}
				<DdContext.Consumer>
					{ddContext =>
						ddContext.onClickAway && (
							<span
								class="fs-4 lh-1 opacity-75 float-end ps-2 mt-1 c-pointer"
								type="button"
								onClick={ddContext.onClickAway}
							>
								{TIMES}
							</span>
						)
					}
				</DdContext.Consumer>
			</h3>
			{selectorEl && <div class="p-3">{selectorEl}</div>}
			<div
				className={`card-body overflow-auto flex-shrink-1 hide-if-empty mb-3 pb-0 ${
					selectorEl ? 'pt-0' : ''
				}`}
			>
				{bodyEl}
			</div>
			{mapEl}
		</div>
	)
}

type MapWrapMarkerGroup = {
	code: string
	title: string
	markers: 'external' | MapMarkerRaw[]
}

function addMarkerGroupsByDomains(
	markerGroups: MapWrapMarkerGroup[],
	domains: { code: string; name: string; type: GI_DomainTypeCode; location: MapLocation }[],
) {
	for (const domain of domains) {
		const loc = domain.location
		const icon = getDomainIconSrc(domain.type)
		markerGroups.push({ code: domain.code, title: domain.name, markers: [{ ...loc, icon }] })
	}
}
function addMarkerGroupsByEnemies(
	markerGroups: MapWrapMarkerGroup[],
	enemies: { code: string; name: string; locations: 'external' | MapLocation[] }[],
) {
	for (const enemy of enemies) {
		const markers =
			enemy.locations === 'external'
				? 'external'
				: enemy.locations.map((loc): MapMarkerRaw => {
						const icon = getEnemyIconSrc(enemy.code)
						return { ...loc, icon, style: 'circle' }
				  })
		markerGroups.push({ code: enemy.code, title: enemy.name, markers })
	}
}

function MapWrap({
	itemData,
	markerGroups,
	isItemFavable,
}: {
	itemData?: {
		imgSrc: string
		item: ItemShortInfo | ArtifactFullInfo | WeaponFullInfo
	}
	markerGroups: MapWrapMarkerGroup[]
	isItemFavable?: boolean
}): JSX.Element {
	const [selectedSource, setSelectedSource] = useSelectable(markerGroups)

	const [selectedMapCode, setMapCode] = useState<MapCode>(GI_MAP_CODES[0])
	const TeyvatMap = useFetch(() => LazyTeyvatMap.then(x => x.TeyvatMap), [])

	const setSourceAndFixMapCode = (selectedSource: MapWrapMarkerGroup) => {
		if (
			selectedSource.markers !== 'external' &&
			!selectedSource.markers.find(m => m.mapCode === selectedMapCode)
		)
			setMapCode(selectedSource.markers[0].mapCode)
		setSelectedSource(selectedSource)
	}
	const goToPrevGroup = () => {
		setSourceAndFixMapCode(arrGetAfter(markerGroups, selectedSource, -1))
	}
	const goToNextGroup = () => {
		setSourceAndFixMapCode(arrGetAfter(markerGroups, selectedSource))
	}

	let sourceSelectEl
	if (!markerGroups.length) {
		sourceSelectEl = null
	} else if (markerGroups.length === 1) {
		sourceSelectEl = <span className="align-self-center lh-1 small">{markerGroups[0].title}</span>
	} else if (markerGroups.length < 3) {
		sourceSelectEl = (
			<BtnTabGroup
				tabs={markerGroups}
				selectedTab={selectedSource}
				onTabSelect={setSourceAndFixMapCode}
				classes="w-100"
			/>
		)
	} else {
		sourceSelectEl = (
			<div className="btn-group w-100">
				<button
					type="button"
					class="btn btn-secondary border-dark border-end-0 text-muted fs-4 lh-1"
					onClick={goToPrevGroup}
				>
					{LEFT_POINTING}
				</button>
				<SimpleSelect
					options={markerGroups}
					selectedOption={selectedSource}
					onOptionSelect={setSourceAndFixMapCode}
					classes="w-100 rounded-0"
				/>
				<button
					type="button"
					class="btn btn-secondary border-dark border-start-0 text-muted fs-4 lh-1"
					onClick={goToNextGroup}
				>
					{RIGHT_POINTING}
				</button>
			</div>
		)
	}
	const visibleMapCodes = useMemo(
		() =>
			GI_MAP_CODES.filter(
				c =>
					selectedSource.markers !== 'external' &&
					selectedSource.markers.some(m => m.mapCode === c),
			),
		[selectedSource],
	)
	const isItemWeaponPrimaryMaterial = useMemo(
		() =>
			itemData?.item &&
			'types' in itemData.item &&
			~itemData?.item.types?.indexOf('weapon-material-primary'),
		[itemData?.item],
	)
	return (
		<div className={`map-wrap position-relative mb-3`}>
			<div className="map-header position-absolute d-flex flex-row justify-content-between px-3 py-1 w-100">
				<div className="map-header-bg position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
				{itemData && (
					<div className="me-2 flex-shrink-1 d-flex align-self-center">
						{isItemWeaponPrimaryMaterial && isItemFavable ? (
							<ToggleWeaponPrimaryMaterialFav
								itemCode={itemData.item.code}
								classes="align-self-center p-1 flex-fill fs-5"
							/>
						) : null}
						<LabeledItemAvatar
							classes="small-avatar small"
							avatarClasses="with-padding "
							imgSrc={itemData.imgSrc}
							title={itemData.item.name}
						/>
					</div>
				)}
				{markerGroups.length ? (
					<div className={`d-flex flex-fill justify-content-end align-self-center`}>
						<label className="me-1 text-muted align-self-center small">{I18N_SOURCE}:</label>
						{sourceSelectEl}
					</div>
				) : null}
			</div>
			<div className="map-tip position-absolute px-3 pt-1 lh-1 top-100 start-0 small text-muted opacity-75 user-select-none">
				{visibleMapCodes.map(c => (
					<div className="d-inline me-2" key={c} onClick={() => setMapCode(c)}>
						{visibleMapCodes.length > 1 ? (
							<input
								className="lh-1 align-middle c-pointer me-1"
								type="radio"
								id={c}
								checked={c === selectedMapCode}
							/>
						) : null}
						<label
							className={`lh-1 align-middle text-capitalize ${
								visibleMapCodes.length > 1 ? 'c-pointer' : ''
							}`}
							for={c}
						>
							{I18N_MAP_CODES_NAME[c]}
						</label>
					</div>
				))}
			</div>
			<div className="map-tip position-absolute px-3 pt-1 lh-1 top-100 end-0 small text-muted opacity-75 pe-none">
				<div class="d-none d-xl-block">{I18N_SCROLL_TO_ZOOM}</div>
				<div class="d-xl-none">{I18N_PINCH_TO_ZOOM}</div>
			</div>
			{selectedSource.markers !== 'external' && isLoaded(TeyvatMap) ? (
				<TeyvatMap
					classes="position-relative"
					pos="auto"
					mapCode={selectedMapCode}
					markers={selectedSource.markers}
				/>
			) : TeyvatMap instanceof Error ? (
				<div>{I18N_ERROR}.</div>
			) : (
				<Spinner />
			)}
		</div>
	)
}

export function ArtifactCard({
	classes,
	artifacts,
	related,
	title,
}: {
	classes?: string
	artifacts: ArtifactFullInfo[]
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
	title: string
}): JSX.Element {
	const [selectedArt, setSelectedArt] = useSelectable(artifacts)

	const dataForMap = useMemo(() => {
		const srcs = selectedArt.obtainSources
		const markerGroups = []
		addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes))

		return {
			itemData: {
				item: selectedArt,
				imgSrc: getArtifactIconSrc(selectedArt.code),
			},
			markerGroups,
		}
	}, [selectedArt, related])
	return (
		<Card
			titleEl={title}
			classes={classes}
			selectorEl={
				artifacts.length > 1 ? (
					<BtnTabGroup
						tabs={artifacts}
						titleFunc={tabTitleFromName}
						selectedTab={selectedArt}
						onTabSelect={setSelectedArt}
						classes="w-100"
					/>
				) : null
			}
			bodyEl={
				<div className="">
					<ItemAvatar
						rarity={selectedArt.rarity}
						classes="float-end me-2 large-avatar"
						src={getArtifactIconLargeSrc(selectedArt.code)}
					/>
					{selectedArt.sets[1] && (
						<>
							<BlockHeader>{I18N_PIECE_BONUS(1)}</BlockHeader>
							<div className="mb-3">{notesToJSX(selectedArt.sets[1])}</div>
						</>
					)}
					{selectedArt.sets[2] && (
						<>
							<BlockHeader>{I18N_PIECES_BONUS(2)}</BlockHeader>
							<div className="mb-3">{notesToJSX(selectedArt.sets[2])}</div>
						</>
					)}
					{selectedArt.sets[4] && (
						<>
							<BlockHeader>{I18N_PIECES_BONUS(4)}</BlockHeader>
							<div className="mb-3">{notesToJSX(selectedArt.sets[4])}</div>
						</>
					)}
					{<RecommendedFor charCodes={selectedArt.recommendedTo} />}
				</div>
			}
			mapEl={dataForMap.markerGroups.length ? <MapWrap {...dataForMap} /> : null}
		></Card>
	)
}

export function WeaponCard({
	classes,
	weapon,
	related,
}: {
	onCloseClick?: () => void
	classes?: string
	weapon: WeaponFullInfo
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	const materials = getAllRelated(related.items, weapon.materialCodes)
	const [materialOnMap, setMaterialOnMap] = useState(materials[0])
	const dataForMap = useMemo(() => {
		const srcs = materialOnMap.obtainSources
		const markerGroups = []
		addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes))

		return {
			itemData: {
				item: materialOnMap,
				imgSrc: getItemIconSrc(materialOnMap.code),
			},
			markerGroups,
		}
	}, [materialOnMap, related])

	return (
		<Card
			titleEl={
				weapon.name
				// <>
				// 	{weapon.name}{' '}
				// 	{ascMaterial && (
				// 		<ToggleWeaponFav
				// 			weaponCode={weapon.code}
				// 			weapMatCode={ascMaterial.code}
				// 			classes="d-inline align-middle p-1"
				// 		/>
				// 	)}
				// </>
			}
			classes={classes}
			bodyEl={
				<div className="">
					<div className="float-end">
						<div className="d-flex w-100 justify-content-around">
							<ItemAvatar
								rarity={weapon.rarity}
								classes="mb-2 large-avatar"
								src={getWeaponIconLageSrc(weapon.code)}
							/>
						</div>

						<div className="d-flex justify-content-between w-100">
							{materials.map(m => (
								<ItemAvatar
									key={m.code}
									rarity={2}
									classes="mb-2 mx-1 small-avatar with-padding"
									src={getItemIconSrc(m.code)}
									onClick={() => setMaterialOnMap(m)}
								/>
							))}
						</div>
					</div>
					<div className="overflow-hidden">
						<BlockHeader classes="d-inline-block me-1">
							{I18N_WEAPON_TYPE_NAME(weapon.typeCode)}
						</BlockHeader>
						<span className="mb-2 text-muted">
							{BULLET} {weapon.obtainSources.map(I18N_WEAPON_OBTAIN_SOURCE_NAME).join(', ')}
						</span>
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
					<div className="mb-3">
						<span className="opacity-75">{I18N_SECONDARY_STAT}</span>
						<div className="">{notesToJSX(weapon.passiveStat)}</div>
					</div>
					<RecommendedFor charCodes={weapon.recommendedTo} />
				</div>
			}
			mapEl={dataForMap.markerGroups.length ? <MapWrap isItemFavable={true} {...dataForMap} /> : null}
		></Card>
	)
}

export function OtherItemCard({
	classes,
	item,
	related,
}: {
	onCloseClick?: () => void
	classes?: string
	item: ItemShortInfo
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	const materials = getAllRelated(related.items, [item.code])
	const materialOnMap = materials[0]
	const dataForMap = useMemo(() => {
		const markerGroups: MapWrapMarkerGroup[] = []
		const srcs = materialOnMap.obtainSources
		addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes))
		if (materialOnMap.locations.length > 0) {
			const icon = getItemIconSrc(materialOnMap.code)
			const markers =
				materialOnMap.locations === 'external'
					? 'external'
					: materialOnMap.locations.map((loc): MapMarkerRaw => ({ ...loc, icon, style: 'outline' }))
			markerGroups.push({ code: materialOnMap.code, title: materialOnMap.name, markers })
		}

		return {
			itemData: {
				item: materialOnMap,
				imgSrc: getItemIconSrc(materialOnMap.code),
			},
			markerGroups,
		}
	}, [materialOnMap, related])

	const isItemCharTalentMaterial = useMemo(() => ~item.types.indexOf('character-material-talent'), [item])
	const isItemWeaponPrimaryMaterial = useMemo(() => ~item.types.indexOf('weapon-material-primary'), [item])
	const codesForCalc = useMemo(() => {
		return [...item.ancestryCodes.reverse(), item.code]
	}, [item])
	return (
		<Card
			titleEl={
				<>
					{item.name}{' '}
					{isItemCharTalentMaterial ? (
						<ToggleTalentMaterialFav itemCode={item.code} classes="d-inline align-middle p-1" />
					) : null}
					{isItemWeaponPrimaryMaterial ? (
						<ToggleWeaponPrimaryMaterialFav
							itemCode={item.code}
							classes="d-inline align-middle p-1"
						/>
					) : null}
				</>
			}
			classes={classes}
			bodyEl={
				item.code === 'brilliant-diamond-gemstone' ? (
					I18N_OBTAINED_DURING_STORYLINE
				) : item.ancestryCodes.length > 0 ? (
					<div className="">
						{/* <ItemAvatar rarity={3} classes="large-avatar float-end" src={getItemIconSrc(item.code)} /> */}
						{/* <BlockHeader>Описание</BlockHeader>
				<div className="mb-3">{notesToJSX()}</div> */}
						<BlockHeader>{I18N_ALCHEMY_CALC}</BlockHeader>
						<AlchemyCalculator ancestryCodes={codesForCalc} />
					</div>
				) : null
			}
			mapEl={dataForMap.markerGroups.length ? <MapWrap {...dataForMap} /> : null}
		></Card>
	)
}
