import { useWindowSize } from '#src/api/hooks'
import { ItemDetailDdMobilePortal, ItemDetailDdPortal } from '#src/components/item-detail-dd-portal'
import { BtnTabGroup } from '#src/components/tabs'
import { BS_isBreakpointLessThen } from '#src/utils/bootstrap'
import { ItemAvatar } from './item-cards'

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
	onCloseClick: () => void
}): JSX.Element {
	return (
		<div className={`card max-height-75vh max-height-xl-50vh ${classes}`}>
			<h3 className="card-header fs-4 d-flex">
				<span className="flex-fill">{titleEl}</span>{' '}
				<span
					class="fs-4 lh-1 opacity-75 float-end ps-2 mt-1 c-pointer"
					type="button"
					onClick={onCloseClick}
				>
					&times;
				</span>
			</h3>
			{selectorEl && <div class="p-3">{selectorEl}</div>}
			<div className={`card-body overflow-auto flex-shrink-1 ${selectorEl ? 'pt-0' : ''}`}>
				{bodyEl}
			</div>
			{mapEl}
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
					<ItemAvatar rarity={5} classes="float-start me-2 mb-2 large" src={''} />
					<h6 className="text-uppercase opacity-75">2 pieces bonus</h6>
					<div className="mb-3">{bonus2}</div>
					<h6 className="text-uppercase opacity-75">4 pieces bonus</h6>
					<div>{bonus4}</div>
				</div>
			}
			mapEl={
				<img
					className="my-3 dungeon-location"
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

function WeaponCard({ onCloseClick }: { onCloseClick: () => void }): JSX.Element {
	return (
		<Card
			titleEl={'Неприлично длинное название оружия'}
			bodyEl={
				<div className="mb-3">
					<div className="clearfix">
						<ItemAvatar rarity={5} classes="float-start me-2 mb-2 large" src={''} />
						<h6 className="text-uppercase opacity-75">Двуручный неч</h6>
						<div className="mb-2 text-muted">Оружейный баннер</div>
					</div>

					<div className="opacity-75">Бонус физ. урона</div>
					<div className="mb-2">10% / 90%</div>
					<div className="opacity-75">Базовая атака</div>
					<div className="mb-2">100 / 900</div>
					<div className="opacity-75">пассивная способность</div>
					<div className="mb-2">100 / 900</div>
					<div className="mb-2 opacity-75">{bonus4}</div>
				</div>
			}
			mapEl={
				<img
					className="my-3 dungeon-location"
					src="https://cs10.pikabu.ru/post_img/2019/11/30/12/15751468251132348.jpg"
				></img>
			}
			onCloseClick={onCloseClick}
		></Card>
	)
}
export function WeaponDetailDd({
	onClickAway,
	targetEl,
}: {
	onClickAway: () => void
	targetEl: HTMLElement | null | undefined
}): JSX.Element {
	return (
		<CardDescMobileWrap onClickAway={onClickAway} targetEl={targetEl}>
			<WeaponCard onCloseClick={onClickAway} />
		</CardDescMobileWrap>
	)
}
