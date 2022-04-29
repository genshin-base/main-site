import { useCallback, useEffect, useMemo, useState } from 'preact/hooks'

import { ArtifactRegularInfo } from '#lib/parsing/combine'
import { GI_ARTIFACT_TYPE_CODES, GI_ArtifactTypeCode } from '#src/../../lib/genshin'
import { apiGetArtifact } from '#src/api/endpoints'
import { getAllRelated } from '#src/api/utils'
import { Accordion } from '#src/components/accordion'
import { BlockHeader } from '#src/components/block-header'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import { CentredSpinner, Spinner } from '#src/components/placeholders'
import { BtnTabGroup } from '#src/components/tabs'
import {
	I18N_ART_TYPE,
	I18N_COLLAPSE,
	I18N_ITEM_STORY,
	I18N_MAIN_INFO,
	I18N_PIECE_BONUS,
	I18N_PIECES_BONUS,
} from '#src/i18n/i18n'
import { notesToJSX } from '#src/modules/builds/common'
import { ARTIFACT_ROW_CARD_HASH_KEY, genEquipmentHash } from '#src/modules/equipment/common'
import { getArtifactIconLargeSrc, getArtifactIconSrc } from '#src/utils/artifacts'
import { isLoaded, useFetch, useHashValue, useScrollTo } from '#src/utils/hooks'
import { BULLET, DASH, ELLIPSIS } from '#src/utils/typography'
import { addMarkerGroupsByDomains, addMarkerGroupsByEnemies, CardMap, CardMapMarkerGroup } from '../card-map'
import { RecommendedTo } from '../common'
import { ItemAvatar } from '../item-avatars'

import './line-cards.scss'

const dummyMarkerGroups: CardMapMarkerGroup[] = [
	{
		code: '',
		title: ELLIPSIS,
		markers: [{ mapCode: 'teyvat', x: 0, y: 0, icon: '' }],
	},
]

type ArtifactRowProps = {
	artifact: ArtifactRegularInfo
	group: number
	isExpanded: boolean
}
type ArtTypeTab = { code: GI_ArtifactTypeCode; title: string }
const artTypeTabs: ArtTypeTab[] = GI_ARTIFACT_TYPE_CODES.map(at => {
	return { code: at, title: I18N_ART_TYPE(at) }
})

function ArtifactCardLine({
	artifact,
	onClose,
}: {
	artifact: ArtifactRegularInfo
	onClose: () => unknown
}): JSX.Element {
	const [selectedArtTypeTab, setSelectedArtTypeTab] = useState<ArtTypeTab>(artTypeTabs[0])

	const artifactFull = useFetch(sig => apiGetArtifact(artifact.code, sig), [artifact])
	const artTypeTabsFiltered = useMemo(() => {
		return isLoaded(artifactFull)
			? artTypeTabs.filter(att => artifactFull.artifact.pieces[att.code])
			: artTypeTabs
	}, [artifactFull])

	useEffect(() => {
		setSelectedArtTypeTab(artTypeTabsFiltered[0])
	}, [artTypeTabsFiltered])

	const dataForMap = useMemo(() => {
		if (!isLoaded(artifactFull)) return { markerGroups: dummyMarkerGroups }
		const srcs = artifact.obtainSources
		const markerGroups: CardMapMarkerGroup[] = []
		addMarkerGroupsByDomains(markerGroups, getAllRelated(artifactFull.maps.domains, srcs.domainCodes))
		addMarkerGroupsByEnemies(markerGroups, getAllRelated(artifactFull.maps.enemies, srcs.enemyCodes))
		return {
			itemData: {
				item: artifact,
				imgSrc: getArtifactIconSrc(artifact.code),
			},
			markerGroups,
		}
	}, [artifactFull, artifact])
	const mainInfoColInner = useMemo(() => {
		return (
			<>
				<div>
					<ItemAvatar
						classes="mb-2 me-2 large-avatar float-start"
						rarity={artifact.rarity}
						src={getArtifactIconLargeSrc(artifact.code)}
					/>
					<h4 className="mb-0">{artifact.name}</h4>
					<div className="overflow-hidden">
						<span className="mb-2 text-muted">
							{/* {BULLET} {artifact.obtainSources.map(I18N_WEAPON_OBTAIN_SOURCE_NAME).join(', ')} */}
						</span>
					</div>
				</div>
				<div className="mt-1 mb-2">
					<RecommendedTo
						navigateToCharacter={true}
						isAvatarWithBorder={true}
						charCodes={artifact.recommendedTo}
					/>
				</div>
				<div className="flex-fill overflow-auto small lh-sm mt-1">
					{artifact.sets[1] && (
						<>
							<BlockHeader>{I18N_PIECE_BONUS(1)}</BlockHeader>
							<div className="mb-3">{notesToJSX(artifact.sets[1])}</div>
						</>
					)}
					{artifact.sets[2] && (
						<>
							<BlockHeader>{I18N_PIECES_BONUS(2)}</BlockHeader>
							<div className="mb-3">{notesToJSX(artifact.sets[2])}</div>
						</>
					)}
					{artifact.sets[4] && (
						<>
							<BlockHeader>{I18N_PIECES_BONUS(4)}</BlockHeader>
							<div className="mb-3">{notesToJSX(artifact.sets[4])}</div>
						</>
					)}
				</div>
			</>
		)
	}, [artifact])
	const loreInfoColInner = useMemo(() => {
		return (
			<>
				<div className="opacity-75">{I18N_ITEM_STORY}</div>
				{isLoaded(artifactFull) ? (
					<>
						<BtnTabGroup
							tabs={artTypeTabsFiltered}
							onTabSelect={setSelectedArtTypeTab}
							selectedTab={selectedArtTypeTab}
							classes="w-100 my-1 btn-group-sm"
						/>
						<div className="fst-italic my-1 small lh-sm text-muted">
							{notesToJSX(
								artifactFull.artifact.pieces[selectedArtTypeTab.code]?.description || null,
							)}
						</div>
						<div className="flex-fill my-1 overflow-auto small lh-sm opacity-75">
							{notesToJSX(artifactFull.artifact.pieces[selectedArtTypeTab.code]?.story || null)}
						</div>
					</>
				) : (
					<Spinner />
				)}
			</>
		)
	}, [artifactFull, selectedArtTypeTab, setSelectedArtTypeTab, artTypeTabsFiltered])
	const locationColInner = useMemo(() => {
		return (
			<div className="d-flex flex-fill flex-column location-col-inner position-relative">
				{dataForMap.markerGroups === dummyMarkerGroups ? (
					<CentredSpinner />
				) : (
					<>
						<div className="flex-fill mt-2">
							<CardMap isFatHead={true} {...dataForMap} classes="h-100" />
						</div>
					</>
				)}
			</div>
		)
	}, [dataForMap])

	const cellClass = 'w-33 d-flex px-2 pb-3 pt-2 flex-column'
	const forAccordion = useMemo(() => {
		return [
			{
				title: `${artifact.name} ${BULLET} ${I18N_MAIN_INFO}`,
				code: 'mainInfoColInner',
				content: mainInfoColInner,
			},
			{ title: I18N_ITEM_STORY, code: 'loreInfoColInner', content: loreInfoColInner },
			{ title: 'todo', code: 'locationColInner', content: locationColInner },
		]
	}, [mainInfoColInner, loreInfoColInner, locationColInner, artifact])
	return (
		<MobileDesktopSwitch
			childrenDesktop={
				<div className="bg-dark rounded-start border border-secondary d-flex w-100 line-card-desktop">
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

export function ArtifactCardTableRow({ artifact, isExpanded, group }: ArtifactRowProps): JSX.Element {
	const [, setSelectedArtifactCode] = useHashValue<string | null>(ARTIFACT_ROW_CARD_HASH_KEY, null)

	const toggleExpand = useCallback(() => {
		isExpanded ? setSelectedArtifactCode(null) : setSelectedArtifactCode(artifact.code)
	}, [isExpanded, setSelectedArtifactCode, artifact.code])
	const bgClass = group === 1 ? 'bg-dark' : 'bg-secondary'

	const [cardRef] = useScrollTo<HTMLTableCellElement>(isExpanded)

	const expandedRow = useMemo(() => {
		return (
			<>
				<tr>
					<td colSpan={5} className="p-2" ref={cardRef}>
						<ArtifactCardLine artifact={artifact} onClose={toggleExpand} />
					</td>
				</tr>
			</>
		)
	}, [artifact, toggleExpand, cardRef])
	const collapsededRow = useMemo(() => {
		return (
			<>
				<tr className={'small lh-sm ' + bgClass}>
					<td colSpan={1}>
						<div className="d-flex c-pointer" onClick={toggleExpand}>
							<ItemAvatar
								classes="me-2 small-avatar align-self-center flex-shrink-0"
								rarity={artifact.rarity}
								src={getArtifactIconLargeSrc(artifact.code)}
							/>
							<a
								href={genEquipmentHash('artifact', artifact.code)}
								className="align-self-center"
							>
								{artifact.name}
							</a>
						</div>
					</td>
					<td className="opacity-75">{artifact.sets[4] ? notesToJSX(artifact.sets[4]) : DASH}</td>
					<MobileDesktopSwitch
						childrenDesktop={
							<>
								<td className="opacity-75">
									{artifact.sets[2] ? notesToJSX(artifact.sets[2]) : DASH}
								</td>
								<td className="opacity-75">
									{artifact.sets[1] ? notesToJSX(artifact.sets[1]) : DASH}
								</td>
							</>
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
	}, [artifact, toggleExpand, bgClass])
	return isExpanded ? expandedRow : collapsededRow
}
