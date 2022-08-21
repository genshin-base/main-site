/**
 * @param {import('./utils').Buffer2d<Uint8ClampedArray,1>} src
 */
export function fastHoughTransform(src) {
	// TODO: copy to TypedArray
	// TODO: maxValue
	const w = src.rect.toSize().width
	const lineBuf = new Uint8ClampedArray(w)
	fastHoughTransformIter(src, 0, w, lineBuf)
	return src
}
/**
 *
 * @param {import('./utils').Buffer2d<Uint8ClampedArray,1>} src
 * @param {number} xmin
 * @param {number} xmax
 * @param {Uint8ClampedArray} lineBuf
 */
function fastHoughTransformIter(src, xmin, xmax, lineBuf) {
	const h = src.rect.toSize().height
	if (xmax - xmin <= 1) {
		for (let j = 0; j < h; j++) src.buf[xmin + j * src.stride] = src.buf[xmin + j * src.stride]
	} else {
		const mid = Math.floor((xmin + xmax) / 2)
		fastHoughTransformIter(src, xmin, mid, lineBuf)
		fastHoughTransformIter(src, mid, xmax, lineBuf)
		for (let y = 0; y < h; y++) {
			for (let shift = 0; shift < xmax - xmin; shift++) {
				const shift2 = shift >> 1
				const ax = xmin + shift2
				const ay = y
				const bx = mid + shift2
				const by = y + ((shift + 1) >> 1)
				lineBuf[shift] =
					src.buf[ax + ay * src.stride] + //
					(by >= h ? 0 : src.buf[bx + by * src.stride])
			}
			for (let shift = 0; shift < xmax - xmin; shift++)
				src.buf[xmin + shift + y * src.stride] = lineBuf[shift]
		}
	}
}
