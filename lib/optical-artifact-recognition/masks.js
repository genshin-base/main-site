import { Buffer2d, ImgRect, mustBeNotNull } from './utils.js'

/**
 * @param {Buffer2d<Uint8ClampedArray,1>} mask
 * @param {Buffer2d<Uint8ClampedArray,4>} img
 */
function mask2rgba(mask, img) {
	if (!img.rect.hasSameSizeAs(mask.rect)) throw new Error('img-mask size mismatch')

	const { width, height } = img.rect.toSize()
	const { iFrom: imgIFrom, jFrom: imgJFrom } = img.rect
	const { iFrom: maskIFrom, jFrom: maskJFrom } = mask.rect
	const { buf: imgBuf, stride: imgStride } = img
	const { buf: maskBuf, stride: maskStride } = mask

	for (let i = 0; i < width; i++)
		for (let j = 0; j < height; j++) {
			const imgPos = (i + imgIFrom + (j + imgJFrom) * imgStride) * 4
			const maskPos = i + maskIFrom + (j + maskJFrom) * maskStride
			imgBuf[imgPos + 0] = imgBuf[imgPos + 1] = imgBuf[imgPos + 2] = maskBuf[maskPos]
		}
}
/**
 * @param {Buffer2d<Uint8ClampedArray,1>} mask
 */
export function mask2canvas(mask) {
	const { width: w, height: h } = mask.rect.toSize()
	const canvas = document.createElement('canvas')
	canvas.width = w
	canvas.height = h
	const idata = new ImageData(w, h)
	idata.data.fill(255)
	const img = new Buffer2d(idata.data, 4, new ImgRect(0, w, 0, h), w)
	mask2rgba(mask, img)
	mustBeNotNull(canvas.getContext('2d')).putImageData(idata, 0, 0)
	return { canvas, idata, img }
}

/**
 * @param {Buffer2d<Uint8ClampedArray,1>} mask
 * @param {number} thresh
 */
export function maskShrink(mask, thresh) {
	const { width, height } = mask.rect.toSize()
	const { iFrom, jFrom } = mask.rect
	const { buf, stride } = mask
	let left = width
	let right = 0
	let top = height
	let bottom = 0
	for (let i = 0; i < width; i++) {
		for (let j = 0; j < height; j++) {
			const pos = i + iFrom + stride * (j + jFrom)
			if (buf[pos] < thresh) {
				if (i < left) left = i
				if (i > right) right = i
				if (j < top) top = j
				if (j > bottom) bottom = j
			}
		}
	}
	return left < right ? mask.view(new ImgRect(left, right + 1, top, bottom + 1)) : mask
}
// /**
//  * @param {Buffer2d<Uint8ClampedArray,1>} mask
//  * @param {number} thresh
//  */
//  export function maskShrinkLeftRight(mask, thresh) {
// 	const { width, height } = mask.rect.toSize()
// 	const { iFrom, jFrom, jTo } = mask.rect
// 	const { buf, stride } = mask
// 	let left = width
// 	let right = 0
// 	for (let i = 0; i < width; i++) {
// 		for (let j = 0; j < height; j++) {
// 			const pos = i + iFrom + stride * (j + jFrom)
// 			if (buf[pos] < thresh) {
// 				if (i < left) left = i
// 				if (i > right) right = i
// 			}
// 		}
// 	}
// 	return left < right ? mask.view(new ImgRect(left, right + 1, jFrom, jTo)) : mask
// }

/**
 * @param {Buffer2d<Uint8ClampedArray,1>} maskA
 * @param {Buffer2d<Uint8ClampedArray,1>} maskB
 */
export function masksDiffSum(maskA, maskB) {
	const { width: aWidth, height: aHeight } = maskA.rect.toSize()
	const { width: bWidth, height: bHeight } = maskB.rect.toSize()
	const { iFrom: aIFrom, jFrom: aJFrom } = maskA.rect
	const { iFrom: bIFrom, jFrom: bJFrom } = maskB.rect
	const { buf: aBuf, stride: aStride } = maskA
	const { buf: bBuf, stride: bStride } = maskB
	let sum = 0
	for (let i = 0; i < Math.min(aWidth, bWidth); i++)
		for (let j = 0; j < Math.min(aHeight, bHeight); j++) {
			const aPos = i + aIFrom + (j + aJFrom) * aStride
			const bPos = i + bIFrom + (j + bJFrom) * bStride
			sum += Math.abs(aBuf[aPos] - bBuf[bPos])
		}
	return sum
}

/**
 * @param {Buffer2d<Uint8ClampedArray,1>} maskA
 * @param {Buffer2d<Uint8ClampedArray,1>} maskB
 * @param {number} dx
 * @param {number} dy
 */
export function maskDiffSumOver(maskA, maskB, dx, dy) {
	const { width: aWidth, height: aHeight } = maskA.rect.toSize()
	const { width: bWidth, height: bHeight } = maskB.rect.toSize()
	const { iFrom: aIFrom, jFrom: aJFrom } = maskA.rect
	const { iFrom: bIFrom, jFrom: bJFrom } = maskB.rect
	const { buf: aBuf, stride: aStride } = maskA
	const { buf: bBuf, stride: bStride } = maskB
	let sum = 0
	for (let i = 0; i < bWidth; i++)
		for (let j = 0; j < bHeight; j++) {
			const bPos = i + bIFrom + (j + bJFrom) * bStride
			const bVal = bBuf[bPos]

			const ax = i + dx
			const ay = j + dy
			let aVal = 255
			if (ax >= 0 && ax < aWidth && ay >= 0 && ay < aHeight) {
				const aPos = ax + aIFrom + (ay + aJFrom) * aStride
				aVal = aBuf[aPos]
				// aBuf[aPos] = bVal
			}

			sum += Math.abs(aVal - bVal)
		}
	return sum
}
/**
 * @param {Buffer2d<Uint8ClampedArray,1>} maskA
 * @param {Buffer2d<Uint8ClampedArray,1>} maskB
 * @param {number} dx
 * @param {number} dy
 */
export function maskWriteOver(maskA, maskB, dx, dy) {
	const { width: aWidth, height: aHeight } = maskA.rect.toSize()
	const { width: bWidth, height: bHeight } = maskB.rect.toSize()
	const { iFrom: aIFrom, jFrom: aJFrom } = maskA.rect
	const { iFrom: bIFrom, jFrom: bJFrom } = maskB.rect
	const { buf: aBuf, stride: aStride } = maskA
	const { buf: bBuf, stride: bStride } = maskB
	for (let i = 0; i < bWidth; i++)
		for (let j = 0; j < bHeight; j++) {
			const ax = i + dx
			const ay = j + dy
			if (ax >= 0 && ax < aWidth && ay >= 0 && ay < aHeight) {
				const aPos = ax + aIFrom + (ay + aJFrom) * aStride
				const bPos = i + bIFrom + (j + bJFrom) * bStride
				aBuf[aPos] = bBuf[bPos]
			}
		}
}
/*
function maskDiffSumOver(maskA, maskB, dx, dy, scale) {
	const { width: aWidth, height: aHeight } = maskA.rect.toSize()
	const { width: bWidth, height: bHeight } = maskB.rect.toSize()
	const { iFrom: aIFrom, jFrom: aJFrom } = maskA.rect
	const { iFrom: bIFrom, jFrom: bJFrom } = maskB.rect
	const { buf: aBuf, stride: aStride } = maskA
	const { buf: bBuf, stride: bStride } = maskB
	const width = Math.round(bWidth * scale)
	const height = Math.round(bHeight * scale)
	const scaleInv = 1 / scale
	let sum = 0
	for (let i = 0; i < width; i++)
		for (let j = 0; j < height; j++) {
			let bx = Math.round(i * scaleInv)
			let by = Math.round(j * scaleInv)
			if (bx >= bWidth) bx = bWidth - 1
			if (by >= bHeight) by = bHeight - 1
			const bPos = bx + bIFrom + (by + bJFrom) * bStride
			const bVal = bBuf[bPos]

			const ax = i + dx
			const ay = j + dy
			let aVal = 255
			if (ax >= 0 && ax < aWidth && ay >= 0 && ay < aHeight) {
				const aPos = ax + aIFrom + (ay + aJFrom) * aStride
				aVal = aBuf[aPos]
				// aBuf[aPos] = bVal
			}

			sum += Math.abs(aVal - bVal)
		}
	return sum
}
*/

/**
 * @param {Buffer2d<Uint8ClampedArray,1>} mask
 * @param {import('./utils').TypedArray} row
 * @param {number} offset
 * @param {1|-1} sign
 * @param {number} incK
 * @param {number} decK
 */
export function maskVLinesDeltaSum(mask, row, offset, sign, incK, decK) {
	const { width, height } = mask.rect.toSize()
	const { iFrom, jFrom } = mask.rect
	const { buf, stride } = mask
	for (let i = 0; i < width; i++) {
		let sum = 0
		let buff = 0
		for (let j = 0; j < height; j++) {
			const a = i - offset < 0 ? 255 : buf[i + offset + iFrom + stride * (j + jFrom)]
			const b = i + offset >= width ? 255 : buf[i - offset + iFrom + stride * (j + jFrom)]
			const delta = Math.max(0, (a - b) * sign)
			buff += (delta - buff) * (buff < delta ? incK : decK)
			sum += buff
		}
		row[i] = sum
	}
}
/**
 * @param {Buffer2d<Uint8ClampedArray,1>} mask
 * @param {import('./utils').TypedArray} col
 * @param {number} offset
 * @param {1|-1} sign
 * @param {number} incK
 * @param {number} decK
 */
export function maskHLinesDeltaSum(mask, col, offset, sign, incK, decK) {
	const { width, height } = mask.rect.toSize()
	const { iFrom, jFrom } = mask.rect
	const { buf, stride } = mask
	for (let j = 0; j < height; j++) {
		let sum = 0
		let buff = 0
		for (let i = 0; i < width; i++) {
			const a = j - offset < 0 ? 255 : buf[i + iFrom + stride * (j + offset + jFrom)]
			const b = j + offset >= height ? 255 : buf[i + iFrom + stride * (j - offset + jFrom)]
			const delta = Math.max(0, (a - b) * sign)
			buff += (delta - buff) * (buff < delta ? incK : decK)
			sum += buff
		}
		col[j] = sum
	}
}

/**
 * @param {Buffer2d<Uint8ClampedArray,1>} mask
 * @param {import('./utils').TypedArray} col
 */
export function maskHLinesSum(mask, col) {
	const { width, height } = mask.rect.toSize()
	const { iFrom, jFrom } = mask.rect
	const { buf, stride } = mask
	for (let j = 0; j < height; j++) {
		let sum = 0
		for (let i = 0; i < width; i++) {
			const pos = i + iFrom + stride * (j + jFrom)
			sum += 255 - buf[pos]
		}
		col[j] = sum
	}
}
