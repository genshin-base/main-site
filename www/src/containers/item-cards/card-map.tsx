import { useMemo } from 'preact/hooks'

import { GI_DomainTypeCode, MapCode, MapLocation } from '#lib/genshin'
import { ArtifactRegularInfo, ItemShortInfo, WeaponRegularInfo } from '#lib/parsing/combine'
import { arrGetAfter } from '#lib/utils/collections'
import { SimpleSelect } from '#src/components/select'
import { Spinner } from '#src/components/spinners'
import { BtnTabGroup, useSelectable } from '#src/components/tabs'
import { MapMarkerRaw } from '#src/components/teyvat-map'
import {
	I18N_ERROR,
	I18N_MAP_CODES_NAME,
	I18N_PINCH_TO_ZOOM,
	I18N_SCROLL_TO_ZOOM,
	I18N_SOURCE,
} from '#src/i18n/i18n'
import { ToggleWeaponPrimaryMaterialFav } from '#src/modules/builds/common'
import { getDomainIconSrc } from '#src/utils/domains'
import { getEnemyIconSrc } from '#src/utils/enemies'
import { isLoaded, useFetch } from '#src/utils/hooks'
import { LEFT_POINTING, RIGHT_POINTING } from '#src/utils/typography'
import { LabeledItemAvatar } from './item-avatars'

const LazyTeyvatMap = import('#src/components/teyvat-map')

export type CardMapMarkerGroup = {
	code: string
	title: string
	markers: 'external' | MapMarkerRaw[]
}

export function addMarkerGroupsByDomains(
	markerGroups: CardMapMarkerGroup[],
	domains: { code: string; name: string; type: GI_DomainTypeCode; location: MapLocation }[],
) {
	for (const domain of domains) {
		const loc = domain.location
		const icon = getDomainIconSrc(domain.type)
		markerGroups.push({ code: domain.code, title: domain.name, markers: [{ ...loc, icon }] })
	}
}
export function addMarkerGroupsByEnemies(
	markerGroups: CardMapMarkerGroup[],
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
export function CardMap({
	itemData,
	markerGroups,
	isItemFavable,
	classes = '',
}: {
	itemData?: {
		imgSrc: string
		item: ItemShortInfo | ArtifactRegularInfo | WeaponRegularInfo
	}
	markerGroups: CardMapMarkerGroup[]
	isItemFavable?: boolean
	classes?: string
}): JSX.Element {
	const TeyvatMap = useFetch(() => LazyTeyvatMap.then(x => x.TeyvatMap), [])

	const [selectedSource, setSelectedSource] = useSelectable(markerGroups)

	const visibleMapCodeTabs = useMemo(() => {
		if (selectedSource.markers === 'external') return []
		const mapCodes = new Set<MapCode>()
		for (const marker of selectedSource.markers) mapCodes.add(marker.mapCode)
		return Array.from(mapCodes, code => ({ code }))
	}, [selectedSource])

	const [selectedMapCodeTab, setMapCodeTab] = useSelectable(visibleMapCodeTabs)
	const selectedMapCode = selectedMapCodeTab.code

	const setSourceAndFixMapCode = (selectedSource: CardMapMarkerGroup) => {
		if (
			selectedSource.markers !== 'external' &&
			!selectedSource.markers.find(m => m.mapCode === selectedMapCode)
		)
			setMapCodeTab({ code: selectedSource.markers[0].mapCode })
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
				classes="w-100 btn-group-sm"
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

	const isItemWeaponPrimaryMaterial = useMemo(
		() =>
			itemData?.item &&
			'types' in itemData.item &&
			~itemData?.item.types?.indexOf('weapon-material-primary'),
		[itemData?.item],
	)

	return (
		<div className={`map-wrap position-relative mb-3 ${classes}`}>
			{selectedSource.markers !== 'external' && isLoaded(TeyvatMap) ? (
				<TeyvatMap
					classes="h-inherit"
					pos="auto"
					mapCode={selectedMapCode}
					markers={selectedSource.markers}
				/>
			) : TeyvatMap instanceof Error ? (
				<div className="text-muted position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center">
					{I18N_ERROR}
				</div>
			) : (
				<Spinner />
			)}
			<div className="map-header position-absolute d-flex top-0 flex-row justify-content-between px-3 py-1 w-100">
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
							isNoBg={true}
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
				{visibleMapCodeTabs.map(({ code }) => (
					<div className="d-inline me-2" key={code} onClick={() => setMapCodeTab({ code })}>
						{visibleMapCodeTabs.length > 1 ? (
							<input
								className="lh-1 align-middle c-pointer me-1"
								type="radio"
								id={code}
								checked={code === selectedMapCode}
							/>
						) : null}
						<label
							className={`lh-1 align-middle text-capitalize ${
								visibleMapCodeTabs.length > 1 ? 'c-pointer' : ''
							}`}
							for={code}
						>
							{I18N_MAP_CODES_NAME[code]}
						</label>
					</div>
				))}
			</div>
			<div className="map-tip position-absolute px-3 pt-1 lh-1 top-100 end-0 small text-muted opacity-75 pe-none">
				<div class="d-none d-xl-block">{I18N_SCROLL_TO_ZOOM}</div>
				<div class="d-xl-none">{I18N_PINCH_TO_ZOOM}</div>
			</div>
		</div>
	)
}
