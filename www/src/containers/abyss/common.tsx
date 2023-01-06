import { generateColor } from '#src/utils/color-gradient'

export const percentsSpectrum = generateColor('#5c568d', '#d81243', 101)
export const possiblePercentLetters = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'F']
export const getPercentLetters = (percent: number) => {
	if (percent > 90) return 'SSS'
	if (percent > 80) return 'SS'
	if (percent > 60) return 'S'
	if (percent > 40) return 'A'
	if (percent > 20) return 'B'
	if (percent > 10) return 'C'
	if (percent > 1) return 'D'
	return 'F'
}
