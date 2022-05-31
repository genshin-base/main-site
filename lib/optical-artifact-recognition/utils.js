/** @typedef {Uint8Array | Uint8ClampedArray | Int8Array | Uint16Array | Int16Array | Uint32Array | Int32Array} TypedArray */

export class ImgSize {
	/**
	 * @param {number} width
	 * @param {number} height
	 */
	constructor(width, height) {
		this.width = width
		this.height = height
	}
	area() {
		return this.width * this.height
	}
	toRect() {
		return new ImgRect(0, this.width, 0, this.height)
	}
}

export class ImgRect {
	/**
	 * @param {number} iFrom
	 * @param {number} iTo
	 * @param {number} jFrom
	 * @param {number} jTo
	 */
	constructor(iFrom, iTo, jFrom, jTo) {
		this.iFrom = iFrom
		this.iTo = iTo
		this.jFrom = jFrom
		this.jTo = jTo
	}
	toSize() {
		return new ImgSize(this.iTo - this.iFrom, this.jTo - this.jFrom)
	}
	toOrigin() {
		return new ImgRect(0, this.iTo - this.iFrom, 0, this.jTo - this.jFrom)
	}
	area() {
		return (this.iTo - this.iFrom) * (this.jTo - this.jFrom)
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	withOffset(x, y) {
		return new ImgRect(this.iFrom + x, this.iTo + x, this.jFrom + y, this.jTo + y)
	}
	/** @param {ImgRect} other */
	hasSameSizeAs(other) {
		return (
			this.iTo - this.iFrom === other.iTo - other.iFrom &&
			this.jTo - this.jFrom === other.jTo - other.jFrom
		)
	}
}

/**
 * @template {Uint8ClampedArray|Uint32Array} TBufType
 * @template {1|4} TComponents
 */
export class Buffer2d {
	/**
	 * @param {TBufType} buf
	 * @param {TComponents} components
	 * @param {ImgRect} rect
	 * @param {number} stride
	 */
	constructor(buf, components, rect, stride) {
		this.buf = buf
		this.components = components
		this.rect = rect
		this.stride = stride
	}
	/**
	 * @param {ImgRect} rect
	 */
	view(rect) {
		const newRect = rect.withOffset(this.rect.iFrom, this.rect.jFrom)
		return new Buffer2d(this.buf, this.components, newRect, this.stride)
	}
	copy() {
		const buf = /**@type {TBufType}*/ (this.buf.slice())
		return new Buffer2d(buf, this.components, this.rect, this.stride)
	}
}

/**
 * @param {HTMLImageElement|HTMLCanvasElement} src
 * @param {HTMLCanvasElement} dest
 * @param {ImgSize} size
 */
export function downscaleImg(src, dest, size) {
	const srcW = src instanceof HTMLCanvasElement ? src.width : src.naturalWidth
	const srcH = src instanceof HTMLCanvasElement ? src.height : src.naturalHeight
	const scale = Math.min(size.width / srcW, size.height / srcH)
	const destW = Math.min(srcW, Math.round(srcW * scale))
	const destH = Math.round((destW / srcW) * srcH)
	dest.width = destW
	dest.height = destH
	const rc = mustBeNotNull(dest.getContext('2d'))
	rc.drawImage(src, 0, 0, destW, destH)
	return new ImgSize(destW, destH)
}

/**
 * @param {Buffer2d<Uint8ClampedArray,4>} img
 * @param {TypedArray} row
 * @param {number} scale
 */
export function sumRow2rgba(img, row, scale) {
	const { width, height } = img.rect.toSize()
	const { iFrom, jFrom } = img.rect
	const { buf, stride } = img
	for (let i = 0; i < width; i++) {
		for (let j = 0; j < Math.min(row[i] * scale, height); j++) {
			const pos = (i + iFrom + stride * (j + jFrom)) * 4
			buf[pos + 0] = 255
			buf[pos + 1] = 32
			buf[pos + 2] = 32
		}
	}
}
/**
 * @param {Buffer2d<Uint8ClampedArray,4>} img
 * @param {TypedArray} col
 * @param {number} scale
 */
export function sumCol2rgba(img, col, scale) {
	const { width, height } = img.rect.toSize()
	const { iFrom, jFrom } = img.rect
	const { buf, stride } = img
	for (let j = 0; j < height; j++) {
		for (let i = 0; i < Math.min(col[j] * scale, width); i++) {
			const pos = (i + iFrom + stride * (j + jFrom)) * 4
			buf[pos + 0] = 255
			buf[pos + 1] = 32
			buf[pos + 2] = 32
		}
	}
}

/**
 * @param {Array<number>|TypedArray} arr
 */
export function getMaxValIndex(arr) {
	let max = -Infinity
	let index = -1
	for (let i = 0; i < arr.length; i++) {
		const v = arr[i]
		if (v > max) {
			max = v
			index = i
		}
	}
	return index
}

/**
 * @param {Array<number>|TypedArray} arr
 * @param {number} index
 * @param {number} offset
 */
export function getAvgPeakPosition(arr, index, offset) {
	const from = Math.max(0, index - offset)
	const to = Math.min(arr.length, index + offset + 1)
	let weight = 0
	let sum = 0
	for (let i = from; i < to; i++) {
		const val = arr[i]
		weight += val * i
		sum += val
	}
	return weight / sum
}

/**
 * @param {Buffer2d<Uint8ClampedArray,4>} img
 * @param {number} x
 * @param {import("./colors").RGB} color
 */
export function vLine2rgba(img, x, [r, g, b]) {
	const { height } = img.rect.toSize()
	const { iFrom, jFrom } = img.rect
	const { buf, stride } = img
	for (let j = 0; j < height; j++) {
		const pos = (x + iFrom + (j + jFrom) * stride) * 4
		buf[pos + 0] = r
		buf[pos + 1] = g
		buf[pos + 2] = b
	}
}
/**
 * @param {Buffer2d<Uint8ClampedArray,4>} img
 * @param {number} y
 * @param {import("./colors").RGB} color
 */
export function hLine2rgba(img, y, [r, g, b]) {
	const { width } = img.rect.toSize()
	const { iFrom, jFrom } = img.rect
	const { buf, stride } = img
	for (let i = 0; i < width; i++) {
		const pos = (i + iFrom + (y + jFrom) * stride) * 4
		buf[pos + 0] = r
		buf[pos + 1] = g
		buf[pos + 2] = b
	}
}

/**
 * TODO
 * @template T
 * @param {T|null} val
 * @returns {T}
 */
export function mustBeNotNull(val) {
	if (val === null) throw new Error('value is null, this should not happen')
	return val
}
