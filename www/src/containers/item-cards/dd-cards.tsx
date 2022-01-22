import { useMemo, useState } from 'preact/hooks'

import { ArtifactFullInfo, ItemShortInfo, WeaponFullInfo } from '#lib/parsing/combine'
import { arrGetAfter } from '#lib/utils/collections'
import { getAllRelated, RelDomainsShort, RelEnemiesShort, RelItemsShort } from '#src/api'
import { useWindowSize } from '#src/api/hooks'
import { ItemDetailDdMobilePortal, ItemDetailDdPortal } from '#src/components/item-detail-dd-portal'
import { SimpleSelect } from '#src/components/select'
import { BtnTabGroup } from '#src/components/tabs'
import { MapMarkerRaw, TeyvatMap } from '#src/components/teyvat-map'
import domainIconSrc from '#src/media/domain.png'
import { notesToJSX } from '#src/modules/builds/character-build-detailed'
import { getArtifactIconSrc } from '#src/utils/artifacts'
import { BS_isBreakpointLessThen } from '#src/utils/bootstrap'
import { getItemIconSrc } from '#src/utils/items'
import { BULLET, LEFT_POINTING, RIGHT_POINTING, TIMES } from '#src/utils/typography'
import { getWeaponIconSrc } from '#src/utils/weapons'
import { ItemAvatar, LabeledItemAvatar } from './item-cards'

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
			<div className={`card-body overflow-auto flex-shrink-1 ${selectorEl ? 'pt-0' : ''}`}>
				{bodyEl}
			</div>
			{mapEl}
		</div>
	)
}

function MapWrap({
	itemData,
	sources,
}: {
	itemData?: {
		imgSrc: string
		name: string
	}
	sources: {
		code: string
		title: string
		markers: MapMarkerRaw[]
	}[]
}): JSX.Element {
	const [selectedSourceTab, setSelectedSourceTab] = useState(sources[0])
	const goToPrevSource = () => {
		setSelectedSourceTab(arrGetAfter(sources, selectedSourceTab, -1))
	}
	const goToNextSource = () => {
		setSelectedSourceTab(arrGetAfter(sources, selectedSourceTab))
	}
	let sourceSelectEl
	if (!sources.length) {
		sourceSelectEl = null
	} else if (sources.length === 1) {
		sourceSelectEl = <span className="align-self-center">{sources[0].title}</span>
	} else if (sources.length < 4) {
		sourceSelectEl = (
			<BtnTabGroup
				tabs={sources}
				selectedTab={selectedSourceTab}
				onTabSelect={setSelectedSourceTab}
				classes="w-100"
			/>
		)
	} else {
		sourceSelectEl = (
			<div className="btn-group w-100">
				<button
					type="button"
					class="btn btn-secondary border-dark border-end-0 text-muted fs-4 lh-1"
					onClick={goToPrevSource}
				>
					{LEFT_POINTING}
				</button>
				<SimpleSelect
					options={sources}
					selectedOption={selectedSourceTab}
					onOptionSelect={setSelectedSourceTab}
					classes="w-100 rounded-0"
				/>
				<button
					type="button"
					class="btn btn-secondary border-dark border-start-0 text-muted fs-4 lh-1"
					onClick={goToNextSource}
				>
					{RIGHT_POINTING}
				</button>
			</div>
		)
	}
	return (
		<div className={`map-wrap position-relative my-3`}>
			<div className="map-header position-absolute d-flex flex-row justify-content-between px-2 py-1 w-100">
				<div className="map-header-bg position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
				{itemData && (
					<LabeledItemAvatar
						classes="me-2 my-1 small-avatar"
						imgSrc={itemData.imgSrc}
						title={itemData.name}
					/>
				)}
				{sources.length ? (
					<div className={`d-flex flex-fill justify-content-end`}>
						<label className="me-1 text-muted align-self-center">Source:</label>
						{sourceSelectEl}
					</div>
				) : null}
			</div>
			<div className="map-tip position-absolute px-2 bottom-0 end-0 small text-muted pe-none opacity-75">
				<div className="map-header-bg position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75 rounded-0 rounded-top not-rounded-top-end"></div>
				<div class="d-none d-xl-block">Scroll to zoom</div>
				<div class="d-xl-none">Pinch to zoom</div>
			</div>
			<TeyvatMap
				classes="dungeon-location position-relative"
				pos="auto"
				markers={selectedSourceTab.markers}
			/>
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
	const artTabs = useMemo(
		() =>
			artifacts.map(a => {
				return { ...a, title: a.name }
			}),
		[artifacts],
	)
	const [selectedArt, setSelectedArt] = useState(artTabs[0])

	const dataForMap = useMemo(() => {
		const srcs = selectedArt.obtainSources
		const domains = getAllRelated(related.domains, srcs.domainCodes).map(domain => {
			const [x, y] = domain.location
			return { code: domain.code, title: domain.name, markers: [{ x, y, icon: domainIconSrc }] }
		})
		const enemies = getAllRelated(related.enemies, srcs.enemyCodes).map(enemy => {
			const markers = enemy.locations.map(([x, y]) => ({ x, y, icon: domainIconSrc })) //TODO: correct icon
			return { code: enemy.code, title: enemy.name, markers }
		})

		return {
			itemData: {
				name: selectedArt.name,
				imgSrc: getArtifactIconSrc(selectedArt.code),
			},
			sources: domains.concat(enemies),
		}
	}, [selectedArt, related])

	return (
		<Card
			titleEl={title}
			classes={classes}
			selectorEl={
				artTabs.length > 1 ? (
					<BtnTabGroup
						tabs={artTabs}
						selectedTab={selectedArt}
						onTabSelect={setSelectedArt}
						classes="w-100"
					/>
				) : null
			}
			bodyEl={
				<div className="mb-3">
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
				</div>
			}
			mapEl={dataForMap.sources.length ? <MapWrap {...dataForMap} /> : null}
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
		const domains = getAllRelated(related.domains, srcs.domainCodes).map(domain => {
			const [x, y] = domain.location
			return { code: domain.code, title: domain.name, markers: [{ x, y, icon: domainIconSrc }] }
		})
		const enemies = getAllRelated(related.enemies, srcs.enemyCodes).map(enemy => {
			const markers = enemy.locations.map(([x, y]) => ({ x, y, icon: domainIconSrc })) //TODO: correct icon
			return { code: enemy.code, title: enemy.name, markers }
		})

		return {
			itemData: {
				name: materialOnMap.name,
				imgSrc: getItemIconSrc(materialOnMap.code),
			},
			sources: domains.concat(enemies),
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
									classes="mb-2 mx-1 small-avatar"
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
					<div>
						<span className="opacity-75">Пассивная способность</span>
						<div className="">{notesToJSX(weapon.passiveStat)}</div>
					</div>
				</div>
			}
			mapEl={dataForMap.sources.length ? <MapWrap {...dataForMap} /> : null}
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
	const materialOnMap = materials[0] //todo

	const dataForMap = useMemo(() => {
		const srcs = materialOnMap.obtainSources
		const domains = getAllRelated(related.domains, srcs.domainCodes).map(domain => {
			const [x, y] = domain.location
			return { code: domain.code, title: domain.name, markers: [{ x, y, icon: domainIconSrc }] }
		})
		const enemies = getAllRelated(related.enemies, srcs.enemyCodes).map(enemy => {
			const markers = enemy.locations.map(([x, y]) => ({ x, y, icon: domainIconSrc })) //TODO: correct icon
			return { code: enemy.code, title: enemy.name, markers }
		})

		return {
			itemData: {
				name: materialOnMap.name,
				imgSrc: getItemIconSrc(materialOnMap.code),
			},
			sources: domains.concat(enemies),
		}
	}, [materialOnMap, related])

	return (
		<Card
			titleEl={item.name}
			classes={classes}
			bodyEl={
				<div className="">
					<ItemAvatar rarity={3} classes="large-avatar float-end" src={getItemIconSrc(item.code)} />
					{/* <h6 className="text-uppercase opacity-75">Описание</h6>
					<div className="mb-3">{notesToJSX()}</div> */}
				</div>
			}
			mapEl={dataForMap.sources.length ? <MapWrap {...dataForMap} /> : null}
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
