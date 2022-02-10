import { getRegionTime, GI_ServerRegionCode } from '#lib/genshin'

import { useForceUpdate, useLocalStorage, useVisibleTicker } from '#src/utils/hooks'
import { msToHmWords } from '#src/utils/dates'
import { SK_DEFAULT_SELECTED_REGION_CODE, SK_SELECTED_REGION_CODE } from '#src/utils/local-storage-keys'

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
			{msToHmWords(resetIn)}
			<span className="animation-glow">.</span>
		</div>
	)
}
