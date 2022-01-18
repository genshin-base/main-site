import { useMemo } from 'preact/hooks'

import { ItemObtainInfo, WeaponFullInfo } from '#lib/parsing/combine'
import { getAllRelated, RelDomainsShort, RelEnemiesShort, RelItemsShort } from '#src/api'
import { useWindowSize } from '#src/api/hooks'
import { ItemDetailDdMobilePortal, ItemDetailDdPortal } from '#src/components/item-detail-dd-portal'
import { BtnTabGroup } from '#src/components/tabs'
import { TeyvatMap } from '#src/components/teyvat-map'
import { notesToJSX } from '#src/modules/builds/character-build-detailed'
import { BS_isBreakpointLessThen } from '#src/utils/bootstrap'
import { getMaterialIconSrc } from '#src/utils/materials'
import { BULLET, TIMES } from '#src/utils/typography'
import { getWeaponIconSrc } from '#src/utils/weapons'
import { ItemAvatar, LabeledItemAvatar } from './item-cards'

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
		<div className={`item-detail-popover-card card max-height-75vh max-height-xl-50vh ${classes}`}>
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
	item,
	related,
}: {
	item: ItemObtainInfo
	related: RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	const sourceTabs = useMemo(() => {
		const srcs = item.obtainSources
		const domains = getAllRelated(related.domains, srcs.domainCodes).map(domain => {
			return { code: domain.code, title: domain.name, location: domain.location }
		})
		const enemies = getAllRelated(related.enemies, srcs.enemyCodes).map(enemy => {
			return { code: enemy.code, title: enemy.name, location: enemy.locations[0] } //TODO: use all locations
		})
		return domains.concat(enemies)
	}, [item, related])
	const selectedSourceTab = sourceTabs[0]

	return (
		<div className={`map-wrap position-relative my-3 `}>
			<div className="map-header position-absolute d-flex flex-row px-2 py-1 w-100">
				<div className="map-header-bg position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75"></div>
				<LabeledItemAvatar
					classes="me-2 mb-2 small-avatar pt-1"
					imgSrc={getMaterialIconSrc(item.code)}
					title={item.name}
				/>
				{sourceTabs.length > 1 && (
					<div className="flex-fill">
						<BtnTabGroup
							tabs={sourceTabs}
							selectedTab={selectedSourceTab}
							onTabSelect={t => {
								t //TODO
							}}
							classes="w-100"
						/>
					</div>
				)}
			</div>
			<TeyvatMap
				classes="dungeon-location position-relative"
				x={selectedSourceTab.location[0]}
				y={selectedSourceTab.location[1]}
				level={-1.2}
			/>
		</div>
	)
}

const bonus2 = 'Повышает бонус лечения на 15%.'
const bonus4 =
	'Экипированный этим набором артефактов персонаж при лечении соратников создаёт на 3 сек. Пузырь морских красок. Пузырь регистрирует восстановленное при лечении HP (в том числе избыточные, когда лечение превышает максимум здоровья). После окончания действия Пузырь взрывается и наносит окружающим врагам урон в размере 90% учтённого объёма лечения (урон рассчитывается так же, как для эффектов Заряжен и Сверхпроводник, но на него не действуют бонусы мастерства стихий, уровня и реакций). Пузырь морских красок можно создавать не чаще, чем раз в 3,5 сек. Пузырь может записать до 30 000 восстановленных HP, в том числе HP избыточного лечения. Для отряда не может существовать больше одного Пузыря морских красок одновременно. Этот эффект действует, даже если персонаж, экипированный набором артефактов, не находится на поле боя.'
function ArtifactCard({ onCloseClick }: { onCloseClick: () => void }): JSX.Element {
	const arts = [1, 2]
	const tabs = [
		{ title: 'Неприлично длинное название сета', code: '1' },
		{ title: 'Еще более длинное название сета :о', code: '2' },
	]
	const selectedTab = tabs[0]
	return (
		<Card
			titleEl={'Неприлично длинное название сета'}
			selectorEl={
				arts.length ? (
					<BtnTabGroup
						tabs={tabs}
						selectedTab={selectedTab}
						onTabSelect={t => {
							t
						}}
						classes="w-100"
					/>
				) : null
			}
			bodyEl={
				<div className="mb-3">
					<ItemAvatar rarity={5} classes="float-end me-2 mb-2 large-avatar" src={''} />
					<h6 className="text-uppercase opacity-75">2 pieces bonus</h6>
					<div className="mb-3">{bonus2}</div>
					<h6 className="text-uppercase opacity-75">4 pieces bonus</h6>
					<div>{bonus4}</div>
				</div>
			}
			mapEl={
				<img
					className="my-3 dungeon-location "
					src="https://cs10.pikabu.ru/post_img/2019/11/30/12/15751468251132348.jpg"
				></img>
			}
			onCloseClick={onCloseClick}
		></Card>
	)
}
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

export function ArtifactDetailDd({
	onClickAway,
	targetEl,
}: {
	onClickAway: () => void
	targetEl: HTMLElement | null | undefined
}): JSX.Element {
	return (
		<CardDescMobileWrap onClickAway={onClickAway} targetEl={targetEl}>
			<ArtifactCard onCloseClick={onClickAway} />
		</CardDescMobileWrap>
	)
}

export function WeaponCard({
	onCloseClick,
	classes,
	weapon,
	related,
}: {
	onCloseClick?: () => void
	classes?: string
	weapon: WeaponFullInfo
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	console.log(weapon)
	const materials = getAllRelated(related.items, weapon.materialCodes)
	const materialOnMap = materials[0] //todo
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
									rarity={2}
									classes="mb-2 mx-1 small-avatar"
									src={getMaterialIconSrc(m.code)}
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
						<div className="opacity-75">Пассивная способность</div>
						<div className="">{notesToJSX(weapon.passiveStat)}</div>
					</div>
				</div>
			}
			mapEl={materialOnMap && <MapWrap item={materialOnMap} related={related} />}
			onCloseClick={onCloseClick}
		></Card>
	)
}
export function WeaponDetailDd({
	onClickAway,
	targetEl,
	item,
	related,
}: {
	onClickAway: () => void
	targetEl: HTMLElement | null | undefined
	item: WeaponFullInfo
	related: RelItemsShort & RelDomainsShort & RelEnemiesShort
}): JSX.Element {
	return (
		<CardDescMobileWrap onClickAway={onClickAway} targetEl={targetEl}>
			<WeaponCard onCloseClick={onClickAway} weapon={item} related={related} />
		</CardDescMobileWrap>
	)
}
