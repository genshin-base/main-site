import { GI_WeaponObtainSource, GI_WeaponTypeCode } from '#src/../../lib/genshin'
import { WeaponRegularInfo } from '#src/../../lib/parsing/combine'
import { arrSimpleUniq, toggleInArr } from '#src/../../lib/utils/collections'
import { apiGetWeapons } from '#src/api/endpoints'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import { Spinner } from '#src/components/placeholders'
import { WeaponTypeFilter } from '#src/components/weapon-type-filter'
import { WeaponCardTableRow } from '#src/containers/item-cards/line-cards/weapon-card'

import {
	I18N_NOTHING_TO_SHOW,
	I18N_OBTAIN_SOURCES,
	I18N_RARITY,
	I18N_SECONDARY_STAT,
	I18N_SORT_BY,
	I18N_STAT_NAME,
	I18N_SUBSTAT,
	I18N_NAME,
	I18N_WEAPON_OBTAIN_SOURCE_NAME,
	I18N_WEAPON_TYPE,
	I18N_WEAPON_TYPE_FILTER_TIP,
} from '#src/i18n/i18n'
import { isLoaded, useFetch, useUniqKey } from '#src/utils/hooks'
import { useMemo, useState } from 'preact/hooks'

const WEAPON_SORT_CODES = ['rarity', 'atk', 'subStat']
const WEAPON_SORT_NAMES = { rarity: I18N_RARITY, atk: I18N_STAT_NAME('atk'), subStat: I18N_SUBSTAT }
const WEAPON_SORT_FUNCS = {
	rarity: (a: WeaponRegularInfo, b: WeaponRegularInfo) => {
		return b.rarity - a.rarity
	},
	atk: (a: WeaponRegularInfo, b: WeaponRegularInfo) => {
		return b.atk.max - a.atk.max
	},
	subStat: (a: WeaponRegularInfo, b: WeaponRegularInfo) => {
		return (b.subStat ? b.subStat.max : 0) - (a.subStat ? a.subStat.max : 0)
	},
}
function WeaponSort({
	selectedSortCode,
	onSortCodeSelect,
	classes = '',
}: {
	selectedSortCode: string
	onSortCodeSelect: (typeCode: string) => unknown
	classes?: string
}): JSX.Element {
	const key = useUniqKey()
	return (
		<div className={classes}>
			{WEAPON_SORT_CODES.map(c => (
				<div
					className="form-check form-check-inline c-pointer  pe-1"
					key={c}
					onClick={() => onSortCodeSelect(c)}
				>
					<input
						className="form-check-input c-pointer"
						type="radio"
						name={`inlineRadioOptions-${key}`}
						id={`radio-${c}-${key}`}
						checked={selectedSortCode === c}
					/>
					<label className="form-check-label c-pointer text-lowercase" for={`radio-${c}-${key}`}>
						{WEAPON_SORT_NAMES[c]}
					</label>
				</div>
			))}
		</div>
	)
}

type ObtainSourceForFilter = GI_WeaponObtainSource | 'other'
const WEAPON_FILTER_OBTAIN_SOURCE: ObtainSourceForFilter[] = [
	'wishes',
	'event-wishes',
	'events',
	'battle-pass',
	'in-game-shop',
	'forging',
	'other',
]
type FilterOption<T> = { code: T; title: string }

function WeaponFilter<T>({
	selectedSortCodes,
	onFilterCodeSelect,
	filterVariants,
	classes = '',
}: {
	selectedSortCodes: T[]
	onFilterCodeSelect: (newSelectedCodes: T[]) => unknown
	filterVariants: FilterOption<T>[]
	classes?: string
}): JSX.Element {
	const key = useUniqKey()
	return (
		<div className={classes}>
			{filterVariants.map(v => (
				<div className="form-check form-switch form-check-inline pe-1" key={v.code}>
					<input
						className="form-check-input c-pointer"
						type="checkbox"
						role="switch"
						id={`flexSwitch-${v.code}-${key}`}
						checked={selectedSortCodes.includes(v.code)}
						onChange={() => onFilterCodeSelect(toggleInArr([...selectedSortCodes], v.code))}
					/>
					<label className="form-check-label c-pointer" for={`flexSwitch-${v.code}-${key}`}>
						{v.title}
					</label>
				</div>
			))}
		</div>
	)
}

export function WeaponsList() {
	const [selectedWeaponTypeCode, setSelectedWeaponTypeCode] = useState<null | GI_WeaponTypeCode>(null)
	const selectWeaponTypeCode = code =>
		setSelectedWeaponTypeCode(selectedWeaponTypeCode === code ? null : code)

	const [selectedSortCode, setSelectedSortCode] = useState<string>(WEAPON_SORT_CODES[0])

	const [selectedObtainSourceCodes, setSelectedObtainSourceCodes] =
		useState<ObtainSourceForFilter[]>(WEAPON_FILTER_OBTAIN_SOURCE)

	const weapons = useFetch(apiGetWeapons, [])
	const otherObtainSourceCodes = useMemo(() => {
		if (!isLoaded(weapons)) return []
		const scs = weapons
			.reduce((p, c) => {
				p.push(c.obtainSources)
				return p
			}, [] as GI_WeaponObtainSource[][])
			.flat()
		return arrSimpleUniq(scs).filter(sc => !WEAPON_FILTER_OBTAIN_SOURCE.includes(sc))
	}, [weapons])
	const weaponsFilteredSorted = useMemo(() => {
		if (!isLoaded(weapons)) return []
		const weaponsLocal = weapons.filter(w => {
			return (
				(selectedWeaponTypeCode ? w.typeCode === selectedWeaponTypeCode : true) && //по типу
				(w.obtainSources.find(s => selectedObtainSourceCodes.includes(s)) || //по основным сорсам
					(selectedObtainSourceCodes.includes('other')
						? w.obtainSources.find(s => otherObtainSourceCodes.includes(s))
						: false)) //по всем остальным сорсам
			)
		})
		weaponsLocal.sort(WEAPON_SORT_FUNCS[selectedSortCode])
		return weaponsLocal
	}, [weapons, selectedWeaponTypeCode, selectedSortCode, selectedObtainSourceCodes, otherObtainSourceCodes])
	if (!isLoaded(weapons)) return <Spinner />
	return (
		<>
			<div className="mb-2">
				<label className="opacity-75 pe-2 align-middle py-1">{I18N_OBTAIN_SOURCES}:</label>
				<WeaponFilter
					classes="ms-1"
					selectedSortCodes={selectedObtainSourceCodes}
					onFilterCodeSelect={setSelectedObtainSourceCodes}
					filterVariants={WEAPON_FILTER_OBTAIN_SOURCE.map(s => {
						return { code: s, title: I18N_WEAPON_OBTAIN_SOURCE_NAME(s) }
					})}
				/>
			</div>
			<div className="mb-2">
				<label className="opacity-75 pe-2 align-middle py-1">{I18N_SORT_BY}:</label>
				<WeaponSort
					classes="ms-1"
					selectedSortCode={selectedSortCode}
					onSortCodeSelect={setSelectedSortCode}
				/>
			</div>
			<div className="mb-2">
				<label className="opacity-75 pe-2 align-middle py-1">{I18N_WEAPON_TYPE}:</label>
				<div className="d-flex align-items-center">
					<WeaponTypeFilter
						selectedWeaponTypeCode={selectedWeaponTypeCode}
						onTypeCodeSelect={selectWeaponTypeCode}
					/>
					<label className="text-muted">{`${
						selectedWeaponTypeCode
							? I18N_WEAPON_TYPE_FILTER_TIP[selectedWeaponTypeCode]
							: I18N_WEAPON_TYPE_FILTER_TIP.everything
					} (${weaponsFilteredSorted.length})`}</label>
				</div>
			</div>
			<table className="table table-sm">
				<thead className="bg-dark">
					<tr>
						<th scope="col">{I18N_NAME}</th>
						<th scope="col">{I18N_STAT_NAME('atk')}</th>
						<th scope="col">{I18N_SUBSTAT}</th>
						<MobileDesktopSwitch
							childrenDesktop={<th scope="col">{I18N_SECONDARY_STAT}</th>}
							childrenMobile={null}
						/>
						<th scope="col"></th>
					</tr>
				</thead>
				<tbody>
					{isLoaded(weapons)
						? weaponsFilteredSorted.map((w, i) => (
								<WeaponCardTableRow weapon={w} key={w.code} group={i % 2} />
						  ))
						: null}
				</tbody>
			</table>
			{isLoaded(weapons) && !weaponsFilteredSorted.length && (
				<div className="text-center text-muted fst-italic">{I18N_NOTHING_TO_SHOW}</div>
			)}
		</>
	)
}
