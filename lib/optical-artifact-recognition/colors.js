import { Buffer2d, ImgRect } from './utils.js'

/** @typedef {[number, number, number]} RGB */

/**
 * @param {Buffer2d<Uint8ClampedArray,4>} src
 * @param {Buffer2d<Uint8ClampedArray,4>} dest
 */
export function rgba2hsla(src, dest) {
	if (!src.rect.hasSameSizeAs(dest.rect)) throw new Error('img-mask size mismatch')

	const { width, height } = src.rect.toSize()
	const { iFrom: srcIFrom, jFrom: srcJFrom } = src.rect
	const { iFrom: destIFrom, jFrom: destJFrom } = dest.rect
	const { buf: srcBuf, stride: srcStride } = src
	const { buf: destBuf, stride: destStride } = dest

	for (let i = 0; i < width; i++)
		for (let j = 0; j < height; j++) {
			const srcPos = (i + srcIFrom + (j + srcJFrom) * srcStride) * 4
			const destPos = (i + destIFrom + (j + destJFrom) * destStride) * 4

			const r = srcBuf[srcPos + 0]
			const g = srcBuf[srcPos + 1]
			const b = srcBuf[srcPos + 2]

			let min, max
			let h
			if (r < g) {
				if (g < b) {
					// r g b
					max = b
					min = r
					h = (r - g) / (max - min) + 4
				} else {
					if (r < b) {
						// r b g
						max = g
						min = r
						h = (b - r) / (max - min) + 2
					} else {
						// b r g
						max = g
						min = b
						h = (b - r) / (max - min) + 2
					}
				}
			} else {
				if (r < b) {
					// g r b
					max = b
					min = g
					h = (r - g) / (max - min) + 4
				} else {
					if (g < b) {
						// g b r
						max = r
						min = g
						h = (g - b) / (max - min) + 6
					} else {
						// b g r
						max = r
						min = b
						h = (g - b) / (max - min) + 0
					}
				}
			}
			h *= 255 / 6
			const s = (max + min > 255 ? (max - min) / (510 - max - min) : (max - min) / (max + min)) * 255
			const l = ((r << 11) + (g << 12) + ((b + g) << 10)) >> 13
			destBuf[destPos + 0] = h
			destBuf[destPos + 1] = s
			destBuf[destPos + 2] = l
		}
}
/**
 * @param {RGB} rgb
 * @returns {RGB}
 */
export function singleRgb2hsl(rgb) {
	const img = new Buffer2d(new Uint8ClampedArray(rgb), 4, new ImgRect(0, 1, 0, 1), 1)
	rgba2hsla(img, img)
	return [img.buf[0], img.buf[1], img.buf[2]]
}

// function rgbToHsl(r, g, b) {
// 	;(r /= 255), (g /= 255), (b /= 255)
// 	var max = Math.max(r, g, b),
// 		min = Math.min(r, g, b)
// 	var h,
// 		s,
// 		l = (max + min) / 2

// 	if (max === min) {
// 		h = s = 0 // achromatic
// 	} else {
// 		var d = max - min
// 		s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
// 		switch (max) {
// 			case r:
// 				h = (g - b) / d + (g < b ? 6 : 0)
// 				break
// 			case g:
// 				h = (b - r) / d + 2
// 				break
// 			case b:
// 				h = (r - g) / d + 4
// 				break
// 		}
// 		h /= 6
// 	}

// 	return [h, s, l]
// }

/**
 * @param {Buffer2d<Uint8ClampedArray, 4>} img
 * @param {Buffer2d<Uint8ClampedArray, 1>} mask
 * @param {RGB} color
 * @param {RGB} colorCoefs
 * @param {number} mult
 * @param {number} sub
 */
export function rgba2mask(img, mask, color, colorCoefs, mult, sub) {
	if (!img.rect.hasSameSizeAs(mask.rect)) throw new Error('img-mask size mismatch')

	const [r, g, b] = color
	const [rK, gK, bK] = colorCoefs
	const { width, height } = img.rect.toSize()
	const { iFrom: imgIFrom, jFrom: imgJFrom } = img.rect
	const { iFrom: maskIFrom, jFrom: maskJFrom } = mask.rect
	const { buf: imgBuf, stride: imgStride } = img
	const { buf: maskBuf, stride: maskStride } = mask

	for (let i = 0; i < width; i++)
		for (let j = 0; j < height; j++) {
			const imgPos = (i + imgIFrom + (j + imgJFrom) * imgStride) * 4
			const maskPos = i + maskIFrom + (j + maskJFrom) * maskStride
			const rPix = imgBuf[imgPos + 0]
			const gPix = imgBuf[imgPos + 1]
			const bPix = imgBuf[imgPos + 2]
			const d =
				(Math.abs(rPix - r) * rK + Math.abs(gPix - g) * gK + Math.abs(bPix - b) * bK) * mult - sub
			maskBuf[maskPos] = d
		}
}
