import { useMemo } from 'preact/hooks'

import { apiGetAbyssStats } from '#src/api/endpoints'
import { CentredSpinner } from '#src/components/placeholders'
import { isLoaded, useFetch } from '#src/utils/hooks'
import { CharacterAvatar } from '../item-cards/item-avatars'
import { getPercentLetters, percentsSpectrum, possiblePercentLetters } from './common'

export function MostUsedCharacters({ navigateToCharacter }: { navigateToCharacter: boolean }): JSX.Element {
	const abyssStats = useFetch(apiGetAbyssStats, [])
	// const [elRef, isHovered] = useHover<HTMLDivElement>()
	const charsGrouped = useMemo(() => {
		if (!isLoaded(abyssStats)) return []
		const data = possiblePercentLetters.map((letter, i) => {
			const ppll = possiblePercentLetters.length
			const percentsFixed = Math.round(((ppll - i) / ppll) * 100)
			return {
				letter,
				color: percentsSpectrum[percentsFixed],
				charactersData: [] as { percent: number; charCode: string }[],
			}
		})
		abyssStats.mostUsedCharacters.forEach(charData => {
			const percent = (charData ? charData.use : 0) * 100
			const letter = getPercentLetters(Math.max(percent, 1))
			data.find(d => d.letter === letter)?.charactersData.push({
				percent: percent,
				charCode: charData.code,
			})
		})
		return data
	}, [abyssStats])
	// const stats = useMemo(() => {
	// 	if (!isLoaded(abyssStats)) return {}
	// 	const charCodeLocal = characterCode.includes('traveler') ? 'traveler' : characterCode
	// 	const charData = abyssStats.mostUsedCharacters.find(d => d.code === charCodeLocal)
	// 	const percent = (charData ? charData.use : 0) * 100
	// 	return {
	// 		letters: getLetters(Math.max(percent, 1)),
	// 		percent,
	// 		width: percent + '%',
	// 		color: spectrum[Math.round(Math.max(percent, 1))],
	// 	}
	// }, [abyssStats, characterCode])

	return (
		<div class="most-used-characters position-relative mt-n4 d-flex">
			{!isLoaded(abyssStats) ? <CentredSpinner /> : null}
			<div>Most used characters in abyss</div>
			<div className="d-flex overflow-auto flex-nowrap">
				{charsGrouped.map(g => (
					<div key={g.letter} className="ps-3">
						<div className="fs-4 fw-bold fst-italic" style={{ color: g.color }}>
							{g.letter}
						</div>
						<div className="d-flex overflow-auto flex-nowrap">
							{g.charactersData.map(chd => (
								<CharacterAvatar
									code={chd.charCode}
									href={'/builds/' + chd.charCode}
									classes={`large-avatar me-2`}
								/>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
