import { Buffer2d, ImgRect } from './utils.js'

/**
 * @param {Buffer2d<Uint8ClampedArray,1>} src
 */
export function fastHoughTransform(src) {
	const W = src.rect.toSize().width
	const H = src.rect.toSize().height

	/**
	 * @param {Buffer2d<Uint8ClampedArray,1>} img
	 * @param {number} xmin
	 * @param {number} xmax
	 */
	function calcSums(img, xmin, xmax) {
		const res = new Buffer2d(
			new Uint8ClampedArray(W * (xmax - xmin)),
			1,
			new ImgRect(0, xmax - xmin, 0, W),
			xmax - xmin,
		)
		if (xmax - xmin <= 1) {
			for (let i = 0; i < H; i++) res.buf[i * res.stride] = img.buf[xmin + i * img.stride]
		} else {
			const mid = Math.floor((xmin + xmax) / 2)
			const ans1 = calcSums(img, xmin, mid)
			const ans2 = calcSums(img, mid, xmax)
			for (let x = 0; x < W; x++) {
				for (let shift = 0; shift < xmax - xmin; shift++) {
					const shift2 = Math.floor(shift / 2)
					res.buf[x * res.stride + shift] =
						ans1.buf[x * ans1.stride + shift2] +
						ans2.buf[((x + shift2 + (shift % 2)) % W) * ans2.stride + shift2]
				}
			}
		}
		return res
	}

	return calcSums(src, 0, W)
}
