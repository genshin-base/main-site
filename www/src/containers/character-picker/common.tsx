import { isLoaded } from '#src/utils/hooks'
import { getPercentLetters, percentsSpectrum } from '../abyss/common'

export const getAbyssDataForCharIcon = (code, abyssStats) => {
	if (!isLoaded(abyssStats)) return { color: 'transparent' }
	const percents = (abyssStats.mostUsedCharacters.find(c => c.code === code)?.use || 0) * 100
	const letters = getPercentLetters(percents)
	const color = percentsSpectrum[Math.round(percents)]
	return {
		color,
		badge: (
			<span
				className="fst-italic fw-bold fs-6 position-relative"
				style={{ color, top: '0px', right: '-2px' }}
			>
				{letters}
			</span>
		),
	}
}
