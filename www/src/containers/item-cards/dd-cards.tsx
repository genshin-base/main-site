import { useMemo, useState } from 'preact/hooks'

import { GI_DomainTypeCode, GI_MAP_CODES, GI_RarityCode, MapCode, MapLocation } from '#lib/genshin'
import { ArtifactFullInfo, ItemShortInfo, WeaponFullInfo } from '#lib/parsing/combine'
import { arrGetAfter } from '#lib/utils/collections'
import { getAllRelated, RelDomainsShort, RelEnemiesShort, RelItemsShort } from '#src/api/utils'
import {
	ItemDetailDdMobilePortal,
	ItemDetailDdPortal,
} from '#src/containers/item-cards/item-detail-dd-portal'
import { SimpleSelect } from '#src/components/select'
import Spinner from '#src/components/spinners'
import { BtnTabGroup, tabTitleFromName, useSelectedable } from '#src/components/tabs'
import { notesToJSX } from '#src/modules/builds/common'
import { getArtifactIconSrc } from '#src/utils/artifacts'
import { BS_isBreakpointLessThen } from '#src/utils/bootstrap'
import { getDomainIconSrc } from '#src/utils/domains'
import { getEnemyIconSrc } from '#src/utils/enemies'
import { isLoaded, useFetch, useWindowSize } from '#src/utils/hooks'
import { getItemIconSrc } from '#src/utils/items'
import { BULLET, LEFT_POINTING, RIGHT_POINTING, TIMES } from '#src/utils/typography'
import { getWeaponIconSrc } from '#src/utils/weapons'
import { AlchemyCalculator } from '../alchemy-calculator'
import { ItemAvatar, LabeledItemAvatar } from './item-cards'

import type { MapMarkerRaw } from '#src/components/teyvat-map'
import { getCharacterAvatarSrc } from '#src/utils/characters'
const LazyTeyvatMap = import('#src/components/teyvat-map')
export function getRarityBorder(r: GI_RarityCode): string {
	return r === 5 ? 'border-warning' : 'border-light'
}
function RecommendedFor({ charCodes }: { charCodes: string[] }): JSX.Element {
	return (
		<>
			<h6 class="text-uppercase opacity-75">Recommended for</h6>
			{charCodes.map(c => (
				<ItemAvatar
					src={getCharacterAvatarSrc(c)}
					classes={`small-avatar mb-2 me-2 border ${getRarityBorder(4)}`}
				/>
			))}
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
	onCloseClick,
}: {
	classes?: string
	titleEl: JSX.Nodes | string
	selectorEl?: JSX.Nodes
	bodyEl?: JSX.Nodes
	mapEl?: JSX.Nodes
	onCloseClick?: () => void
}): JSX.Element {
	return (
		<div className={`item-detail-popover-card card ${classes}`}>
			<h3 className="card-header fs-4 d-flex">
				<span className="flex-fill">{titleEl}</span>{' '}
				{onCloseClick && (
					<span
						class="fs-4 lh-1 opacity-75 float-end ps-2 mt-1 c-pointer"
						type="button"
						onClick={onCloseClick}
					>
						{TIMES}
					</span>
				)}
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
}: {
	itemData?: {
		imgSrc: string
		name: string
	}
	markerGroups: MapWrapMarkerGroup[]
}): JSX.Element {
	const [selectedSource, setSelectedSource] = useSelectedable(markerGroups)

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
		sourceSelectEl = <span className="align-self-center lh-1 ">{markerGroups[0].title}</span>
	} else if (markerGroups.length < 4) {
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
	return (
		<div className={`map-wrap position-relative mb-3`}>
			<div className="map-header position-absolute d-flex flex-row justify-content-between px-3 py-1 w-100">
				<div className="map-header-bg position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
				{itemData && (
					<LabeledItemAvatar
						classes="me-2 my-1 small-avatar"
						avatarClasses="with-padding"
						imgSrc={itemData.imgSrc}
						title={itemData.name}
					/>
				)}
				{markerGroups.length ? (
					<div className={`d-flex flex-fill justify-content-end`}>
						<label className="me-1 text-muted align-self-center">Source:</label>
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
							{c}
							{/** todo l10n */}
						</label>
					</div>
				))}
			</div>
			<div className="map-tip position-absolute px-3 pt-1 lh-1 top-100 end-0 small text-muted opacity-75 pe-none">
				<div class="d-none d-xl-block">Scroll to zoom</div>
				<div class="d-xl-none">Pinch to zoom</div>
			</div>
			{selectedSource.markers !== 'external' && isLoaded(TeyvatMap) ? (
				<TeyvatMap
					classes="position-relative"
					pos="auto"
					mapCode={selectedMapCode}
					markers={selectedSource.markers}
				/>
			) : TeyvatMap instanceof Error ? (
				<div>Error.</div>
			) : (
				<Spinner />
			)}
		</div>
	)
}

function ArtifactCard({
	onCloseClick,
	classes,
	artifacts,
	related,
	title,
}: {
	onCloseClick?: () => void
	classes?: string
	artifacts: ArtifactFullInfo[]
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
	title: string
}): JSX.Element {
	const [selectedArt, setSelectedArt] = useSelectedable(artifacts)

	const dataForMap = useMemo(() => {
		const srcs = selectedArt.obtainSources
		const markerGroups = []
		addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes))

		return {
			itemData: {
				name: selectedArt.name,
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
						src={getArtifactIconSrc(selectedArt.code)}
					/>
					{selectedArt.sets[1] && (
						<>
							<h6 className="text-uppercase opacity-75">1 piece bonus</h6>
							<div className="mb-3">{notesToJSX(selectedArt.sets[1])}</div>
						</>
					)}
					{selectedArt.sets[2] && (
						<>
							<h6 className="text-uppercase opacity-75">2 pieces bonus</h6>
							<div className="mb-3">{notesToJSX(selectedArt.sets[2])}</div>
						</>
					)}
					{selectedArt.sets[4] && (
						<>
							<h6 className="text-uppercase opacity-75">4 pieces bonus</h6>
							<div className="mb-3">{notesToJSX(selectedArt.sets[4])}</div>
						</>
					)}
					{<RecommendedFor charCodes={selectedArt.recommendedTo} />}
				</div>
			}
			mapEl={dataForMap.markerGroups.length ? <MapWrap {...dataForMap} /> : null}
			onCloseClick={onCloseClick}
		></Card>
	)
}

export function ArtifactDetailDd({
	onClickAway,
	targetEl,
	items,
	related,
	title,
}: {
	onClickAway: () => void
	targetEl: HTMLElement | null | undefined
	items: ArtifactFullInfo[]
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
	title: string
}): JSX.Element {
	return (
		<CardDescMobileWrap onClickAway={onClickAway} targetEl={targetEl}>
			<ArtifactCard onCloseClick={onClickAway} artifacts={items} related={related} title={title} />
		</CardDescMobileWrap>
	)
}

export function WeaponCard({
	onCloseClick,
	classes,
	weapons,
	related,
}: {
	onCloseClick?: () => void
	classes?: string
	weapons: WeaponFullInfo[]
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	const weapon = weapons[0] //пока оружие приходит только одно, а артефактов может придти несколько
	const materials = getAllRelated(related.items, weapon.materialCodes)
	const [materialOnMap, setMaterialOnMap] = useState(materials[0])
	const dataForMap = useMemo(() => {
		const srcs = materialOnMap.obtainSources
		const markerGroups = []
		addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes))

		return {
			itemData: {
				name: materialOnMap.name,
				imgSrc: getItemIconSrc(materialOnMap.code),
			},
			markerGroups,
		}
	}, [materialOnMap, related])

	return (
		<Card
			titleEl={weapon.name}
			classes={classes}
			bodyEl={
				<div className="">
					<div className="float-end">
						<div className="d-flex w-100 justify-content-around">
							<ItemAvatar
								rarity={weapon.rarity}
								classes="mb-2 large-avatar"
								src={getWeaponIconSrc(weapon.code)}
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
						<h6 className="text-uppercase opacity-75 d-inline-block me-1">{weapon.typeCode}</h6>

						<span className="mb-2 text-muted">
							{BULLET} {weapon.obtainSources.join(', ')}
						</span>
					</div>
					<div className="d-flex">
						<div className="me-2">
							<div className="opacity-75">Базовая атака</div>
							<div className="mb-2">
								{weapon.mainStat.value1} / {weapon.mainStat.value90}
							</div>
						</div>
						<div>
							<div className="opacity-75">{weapon.subStat.code} </div>
							<div className="mb-2">
								{weapon.subStat.value1} / {weapon.subStat.value90}
							</div>
						</div>
					</div>
					<div className="mb-3">
						<span className="opacity-75">Пассивная способность</span>
						<div className="">{notesToJSX(weapon.passiveStat)}</div>
					</div>
					<RecommendedFor charCodes={weapon.recommendedTo} />
				</div>
			}
			mapEl={dataForMap.markerGroups.length ? <MapWrap {...dataForMap} /> : null}
			onCloseClick={onCloseClick}
		></Card>
	)
}
export function WeaponDetailDd({
	onClickAway,
	targetEl,
	items,
	related,
}: {
	onClickAway: () => void
	targetEl: HTMLElement | null | undefined
	items: WeaponFullInfo[]
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	return (
		<CardDescMobileWrap onClickAway={onClickAway} targetEl={targetEl}>
			<WeaponCard onCloseClick={onClickAway} weapons={items} related={related} />
		</CardDescMobileWrap>
	)
}

export function OtherItemCard({
	onCloseClick,
	classes,
	items,
	related,
}: {
	onCloseClick?: () => void
	classes?: string
	items: ItemShortInfo[]
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	const item = items[0] //пока предмет приходит только одно, а артефактов может придти несколько
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
				name: materialOnMap.name,
				imgSrc: getItemIconSrc(materialOnMap.code),
			},
			markerGroups,
		}
	}, [materialOnMap, related])
	// item.craftedFrom3Code && console.log(getAllRelated(related.items, [item.craftedFrom3Code]))
	console.log(item.ancestryCodes)
	const codesForCalc = useMemo(() => {
		return [...item.ancestryCodes.reverse(), item.code]
	}, [item])
	return (
		<Card
			titleEl={item.name}
			classes={classes}
			bodyEl={
				item.ancestryCodes.length > 0 ? (
					<div className="">
						{/* <ItemAvatar rarity={3} classes="large-avatar float-end" src={getItemIconSrc(item.code)} /> */}
						{/* <h6 className="text-uppercase opacity-75">Описание</h6>
				<div className="mb-3">{notesToJSX()}</div> */}
						<h6 class="text-uppercase opacity-75">alchemy calculator</h6>
						<AlchemyCalculator ancestryCodes={codesForCalc} />
					</div>
				) : null
			}
			mapEl={dataForMap.markerGroups.length ? <MapWrap {...dataForMap} /> : null}
			onCloseClick={onCloseClick}
		></Card>
	)
}
export function OtherItemCardDetailDd({
	onClickAway,
	targetEl,
	items,
	related,
}: {
	onClickAway: () => void
	targetEl: HTMLElement | null | undefined
	items: ItemShortInfo[]
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	return (
		<CardDescMobileWrap onClickAway={onClickAway} targetEl={targetEl}>
			<OtherItemCard onCloseClick={onClickAway} items={items} related={related} />
		</CardDescMobileWrap>
	)
}
