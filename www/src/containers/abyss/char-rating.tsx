import { useMemo } from 'preact/hooks'

import { apiGetAbyssStats } from '#src/api/endpoints'
import { CentredSpinner } from '#src/components/placeholders'
import { Tooltip } from '#src/components/tooltip'
import { I18N_USED_IN_ABYSS } from '#src/i18n/i18n'
import { isLoaded, useFetch, useHover } from '#src/utils/hooks'
import { getPercentLetters, percentsSpectrum } from './common'

export function CharacterRating({ characterCode }: { characterCode: string }): JSX.Element {
	const abyssStats = useFetch(apiGetAbyssStats, [])
	const [elRef, isHovered] = useHover<HTMLDivElement>()
	const stats = useMemo(() => {
		if (!isLoaded(abyssStats)) return {}
		const charCodeLocal = characterCode.includes('traveler') ? 'traveler' : characterCode
		const charData = abyssStats.mostUsedCharacters.find(d => d.code === charCodeLocal)
		const percent = (charData ? charData.use : 0) * 100
		return {
			letters: getPercentLetters(Math.max(percent, 1)),
			percent,
			width: percent + '%',
			color: percentsSpectrum[Math.round(Math.max(percent, 1))],
		}
	}, [abyssStats, characterCode])
	return (
		<div class="character-rating position-relative mt-n4">
			{!isLoaded(abyssStats) ? <CentredSpinner /> : null}
			<div className="d-flex flex-row-reverse" style={{ color: stats.color || '' }}>
				<div class="d-flex align-items-center c-help" ref={elRef}>
					<span class="badge rounded-pill bg-secondary me-1 opacity-75">?</span>
					<span class="fs-3 fst-italic" ref={elRef}>
						{stats.letters}
					</span>
				</div>
			</div>
			{elRef.current && isHovered ? (
				<Tooltip targetEl={elRef.current}>{I18N_USED_IN_ABYSS(stats.percent || 0)}</Tooltip>
			) : null}
			<div class="progress">
				<div
					class="progress-bar"
					role="progressbar"
					style={{ width: stats.width, backgroundColor: stats.color }}
					aria-valuenow={stats.percent}
					aria-valuemin="0"
					aria-valuemax="100"
				></div>
			</div>
		</div>
	)
}
