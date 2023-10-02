import { useCallback, useMemo } from 'preact/hooks'

import { getRegionTime, GI_ServerRegionCode } from '#lib/genshin'
import { WebApp } from '#lib/telegram/webapp'
import {
	I18N_ASIA,
	I18N_CHANGE,
	I18N_EUROPE,
	I18N_MS_TO_HM_WORDS,
	I18N_NORH_AMERICA,
	I18N_REGION,
	I18N_SELECT_REGION,
} from '#src/i18n/i18n'
import { useForceUpdate, useVersionedStorage, useVisibleTicker } from '#src/utils/hooks'
import { SV_SELECTED_REGION_CODE } from '#src/utils/local-storage-keys'
import { BULLET, ELLIPSIS } from '#src/utils/typography'

type Opt = { text: string; id: GI_ServerRegionCode }
const europeOpt: Opt = { text: I18N_EUROPE, id: 'europe' }
const options: Opt[] = [
	europeOpt,
	{ text: I18N_ASIA, id: 'asia' },
	{ text: I18N_NORH_AMERICA, id: 'north-america' },
]
export function TimeUntilDayReset({ classes = '' }: { classes?: string }): JSX.Element {
	const [selectedRegionCode, setSelectedRegionCode] = useVersionedStorage(SV_SELECTED_REGION_CODE)
	const { resetIn } = getRegionTime(selectedRegionCode)
	const forceUpdate = useForceUpdate()
	useVisibleTicker(() => {
		forceUpdate()
	}, 60 * 1000)

	const selectedOption: string = useMemo(
		() => options.find(o => o.id === selectedRegionCode)?.text || 'europe',
		[selectedRegionCode],
	)
	const showTgModal = useCallback(() => {
		I18N_SELECT_REGION
		WebApp.showPopup(
			{
				title: I18N_REGION,
				message: I18N_SELECT_REGION,
				buttons: options,
			},
			(id: string) => {
				if (!options.find(o => o.id === id)) return
				setSelectedRegionCode(id as GI_ServerRegionCode)
			},
		)
	}, [setSelectedRegionCode])
	return (
		<div className={`time-until-day-reset d-flex flex-wrap align-items-baseline ${classes}`}>
			<span className="fs-5">{BUNDLE_ENV.IS_SSR ? ELLIPSIS : I18N_MS_TO_HM_WORDS(resetIn)}</span>
			<span className="animation-time-glow px-1">{BULLET}</span>
			<div className="flex-break .d-block d-lg-none" />
			{selectedOption}
			{BUNDLE_ENV.IS_TG_MINI_APP ? (
				<button className="btn btn-link px-1 py-0" onClick={showTgModal}>
					{I18N_CHANGE}
				</button>
			) : null}
		</div>
	)
}
