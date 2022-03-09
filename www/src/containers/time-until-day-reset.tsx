import { getRegionTime, GI_ServerRegionCode } from '#lib/genshin'
import { msToHmWords } from '#src/utils/dates'
import { useForceUpdate, useLocalStorage, useVisibleTicker } from '#src/utils/hooks'
import { SK_DEFAULT_SELECTED_REGION_CODE, SK_SELECTED_REGION_CODE } from '#src/utils/local-storage-keys'
import { BULLET, ELLIPSIS } from '#src/utils/typography'

export function TimeUntilDayReset({ classes = '' }: { classes?: string }): JSX.Element {
	const [selectedRegionCode] = useLocalStorage<GI_ServerRegionCode>(
		SK_SELECTED_REGION_CODE,
		SK_DEFAULT_SELECTED_REGION_CODE,
	)
	const { resetIn } = getRegionTime(selectedRegionCode)
	const forceUpdate = useForceUpdate()
	useVisibleTicker(() => {
		forceUpdate()
	}, 60 * 1000)
	return (
		<div className={`time-until-day-reset ${classes}`}>
			{BUNDLE_ENV.IS_SSR ? ELLIPSIS : msToHmWords(resetIn)}
			<span className="animation-time-glow ps-1">{BULLET}</span>
		</div>
	)
}
