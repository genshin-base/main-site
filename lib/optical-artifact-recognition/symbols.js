import { mask2canvas } from './masks.js'
import { Buffer2d, ImgSize, mustBeNotNull } from './utils.js'

/**
 * @typedef {{
 *   symbol: string,
 *   sizes: {fontSize:number, mask:Buffer2d<Uint8ClampedArray,1>}[]
 * }} SymbolMask
 */

/**
 * @param {number[]} fontSizes
 * @returns {SymbolMask[]}
 */
export function makeSymbolMasks(fontSizes) {
	const symbols = charRange('AZ') + charRange('az') + "' "

	const canvas = document.createElement('canvas')
	const rc = mustBeNotNull(canvas.getContext('2d'))
	const symbolMasks = /**@type {SymbolMask[]}*/ ([])

	for (const fontSize of fontSizes) {
		rc.font = `${fontSize}px Genshin`
		const { actualBoundingBoxAscent: globalTop, actualBoundingBoxDescent: globalBottom } =
			rc.measureText(symbols)

		for (const symbol of symbols) {
			const measure = rc.measureText(symbol)
			const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right } = measure
			const w = Math.ceil(left + right || measure.width) //left+right is zero for space
			const h = Math.ceil(globalTop + globalBottom)

			rc.fillStyle = 'white'
			rc.fillRect(0, 0, canvas.width, canvas.height)
			rc.fillStyle = 'black'
			rc.fillText(symbol, left, globalTop)

			const idata = rc.getImageData(0, 0, w, h)
			const buf = new Uint8ClampedArray(w * h)
			for (let i = 0; i < w * h; i++) buf[i] = idata.data[i * 4]
			const mask = new Buffer2d(buf, 1, new ImgSize(w, h).toRect(), w)
			// mask = maskShrinkLeftRight(mask, 240) //TODO: is better?

			if ('mn'.includes(symbol)) {
				const { canvas } = mask2canvas(mask)
				document.body.appendChild(canvas)
			}

			let symbolMask = symbolMasks.find(x => x.symbol === symbol)
			if (!symbolMask) {
				symbolMask = { symbol, sizes: [] }
				symbolMasks.push(symbolMask)
			}
			symbolMask.sizes.push({ fontSize, mask })
		}
	}
	return symbolMasks
}

/**
 * @param {string} startEnd
 */
function charRange(startEnd) {
	let chars = ''
	for (let i = startEnd.charCodeAt(0); i <= startEnd.charCodeAt(1); i++) chars += String.fromCharCode(i)
	return chars
}

// /**
//  * @param {string} text
//  */
//  function maskFromText(text) {
// 	const canvas = document.createElement('canvas') //TODO:reuse (+ensure size)
// 	const rc = mustBeNotNull(canvas.getContext('2d'))
// 	rc.fillStyle = 'white'
// 	rc.fillRect(0, 0, canvas.width, canvas.height)
// 	rc.fillStyle = 'black'
// 	rc.font = '9.5px Genshin'
// 	// rc.textBaseline = 'top'
// 	const m = rc.measureText(text)
// 	const { actualBoundingBoxLeft: left, actualBoundingBoxRight: right } = m
// 	const { actualBoundingBoxAscent: top, actualBoundingBoxDescent: bottom } = m
// 	const w = Math.ceil(left + right)
// 	const h = Math.ceil(top + bottom)
// 	rc.fillText(text, left, top)
// 	const idata = rc.getImageData(0, 0, w, h)
// 	const buf = new Uint8ClampedArray(w * h)
// 	for (let i = 0; i < w * h; i++) buf[i] = idata.data[i * 4]
// 	return new Buffer2d(buf, 1, new ImgSize(w, h).toRect(), w)
// }
