import { useMemo, useState } from 'preact/hooks'

import { ArtifactRegularInfo, ItemShortInfo, WeaponRegularInfo } from '#lib/parsing/combine'
import { getAllRelated, RelDomainsShort, RelEnemiesShort, RelItemsShort } from '#src/api/utils'
import { BlockHeader } from '#src/components/block-header'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import { BtnTabGroup, tabTitleFromName, useSelectable } from '#src/components/tabs'
import {
	ItemDetailDdMobilePortal,
	ItemDetailDdPortal,
} from '#src/containers/item-cards/item-detail-dd-portal'
import {
	I18N_ALCHEMY_CALC,
	I18N_BASE_ATTACK,
	I18N_OBTAINED_DURING_STORYLINE,
	I18N_PIECE_BONUS,
	I18N_PIECES_BONUS,
	I18N_SECONDARY_STAT,
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
import { getItemIconSrc } from '#src/utils/items'
import { BULLET } from '#src/utils/typography'
import { getWeaponIconLageSrc } from '#src/utils/weapons'
import { AlchemyCalculator } from '../alchemy-calculator'
import { addMarkerGroupsByDomains, addMarkerGroupsByEnemies, CardMap, CardMapMarkerGroup } from './card-map'
import { RecommendedTo } from './common'
import { DdContext, ItemAvatar } from './item-avatars'

import type { MapMarkerRaw } from '#src/components/teyvat-map'
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
	return (
		<MobileDesktopSwitch
			childrenDesktop={
				<ItemDetailDdPortal onClickAway={onClickAway} targetEl={targetEl} shouldScrollToTop={true}>
					{children}
				</ItemDetailDdPortal>
			}
			childrenMobile={
				<ItemDetailDdMobilePortal onClickAway={onClickAway}>{children}</ItemDetailDdMobilePortal>
			}
		/>
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
			<h3 className="card-header fs-4 d-flex position-relative">
				<span className="flex-fill">{titleEl}</span>{' '}
				<DdContext.Consumer>
					{ddContext =>
						ddContext.onClickAway && (
							<button
								type="button"
								class="btn-close btn-sm position-absolute end-0 top-50 translate-middle"
								aria-label="Close"
								onClick={ddContext.onClickAway}
							></button>
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

export function ArtifactCard({
	classes,
	artifacts,
	related,
	title,
}: {
	classes?: string
	artifacts: ArtifactRegularInfo[]
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
						classes="w-100 btn-group-sm"
						visibleTabsLength={3}
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
					{<RecommendedTo charCodes={selectedArt.recommendedTo} />}
				</div>
			}
			mapEl={dataForMap.markerGroups.length ? <CardMap {...dataForMap} /> : null}
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
	weapon: WeaponRegularInfo
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
									classes={`mb-2 mx-1 small-avatar with-padding ${
										materialOnMap.code !== m.code && 'opacity-50'
									}`}
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
					<RecommendedTo charCodes={weapon.recommendedTo} />
				</div>
			}
			mapEl={dataForMap.markerGroups.length ? <CardMap isItemFavable={true} {...dataForMap} /> : null}
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
		const markerGroups: CardMapMarkerGroup[] = []
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
			mapEl={dataForMap.markerGroups.length ? <CardMap {...dataForMap} /> : null}
		></Card>
	)
}
