import { WeaponFullInfo } from '#src/../../lib/parsing/combine'
import { BlockHeader } from '#src/components/block-header'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import { TeyvatMap } from '#src/components/teyvat-map'
import {
	I18N_BASE_ATTACK,
	I18N_ITEM_STORY,
	I18N_STAT_NAME,
	I18N_WEAPON_OBTAIN_SOURCE_NAME,
	I18N_WEAPON_TYPE_NAME,
} from '#src/i18n/i18n'
import { BULLET, DASH } from '#src/utils/typography'
import { getWeaponIconLageSrc } from '#src/utils/weapons'
import { useCallback, useMemo, useState } from 'preact/hooks'
import { RecommendedTo } from './common'
import { ItemAvatar } from './item-avatars'

const inGameDescription =
	'Beneath its rusty exterior is a lavishly decorated thin blade. It swings as swiftly as the wind.'
const itemStory = `
A nimble sword with holes and delicate engravings on the blade.
The sword once made the sound of a flute when wielded by one with the requisite skill. The pitch and tone were determined by the swinging angle.
This sword was buried when the Wanderer's Troupe disbanded. Unearthed years later, it has long since lost its ability to sing.
Even so, it still makes a lethal weapon.

Among the members of the Wanderer's Troupe was a valiant sword-wielding dancer.
After the Troupe's attempt to tear down the ruling class failed, she was enslaved as a gladiator.

Though all her hope and all her companions were lost, still she fought bravely.
Her sword sang with the radiance of the morn's light, and she was dubbed the "Dawnlight Swordswoman."

In his youth, the Dawn Knight Ragnvindr was in the retinue of a knight.
He went with his master to watch a gladiator match, and was moved by the Dawnlight Swordswoman's splendid finale.
He named himself the Dawn Knight in her honor, and knew in his heart what he must do next.`
type WeaponRowProps = {
	weapon: WeaponFullInfo
	group: number
	isExpanded?: boolean
}
function WeaponCardLine({ weapon, onClose }): JSX.Element {
	const expandedRowStyle = { height: '300px' }
	const cellClass = 'w-33 d-flex px-2 pb-3 pt-2 flex-column'
	return (
		<div className="bg-dark rounded-start border border-secondary d-flex w-100" style={expandedRowStyle}>
			<div className={cellClass}>
				<div>
					<ItemAvatar
						classes="mb-2 me-2 large-avatar float-start"
						rarity={5}
						src={getWeaponIconLageSrc('thundering-pulse')}
					/>
					<h4 className="mb-0">{weapon.name}</h4>
					<div className="overflow-hidden">
						<span className="mb-2 text-muted">{BULLET} quests</span>
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
						charCodes={['amber', 'amber', 'amber']}
					/>
				</div>
				<div className="flex-fill overflow-auto">{weapon.passiveStat}</div>
			</div>
			<div className={cellClass}>
				<div className="opacity-75">{I18N_ITEM_STORY}</div>
				<div>
					<i>{inGameDescription}</i>
				</div>
				<div className="flex-fill overflow-auto">{itemStory}</div>
			</div>
			<div className={cellClass}>
				<button
					type="button"
					className="btn-close btn-sm ms-auto "
					aria-label="Close"
					onClick={onClose}
				></button>
				<div>materials:</div>
				<div className="flex-fill">
					<TeyvatMap mapCode={'teyvat'} pos={'auto'} classes="h-100" />
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
