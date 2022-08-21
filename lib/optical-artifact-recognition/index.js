import { rgba2hsla, rgba2mask, singleRgb2hsl } from './colors.js'
import { fastHoughTransform } from './fht.js'
import {
	mask2canvas,
	maskDiffSumOver,
	maskHLinesDeltaSum,
	maskHLinesSobelD1,
	maskShrink,
	maskVLinesDeltaSum,
	maskVLinesSobelD1,
	maskWriteOver,
} from './masks.js'
import { makeSymbolMasks } from './symbols.js'
import {
	Buffer2d,
	downscaleImg,
	getAvgPeakPosition,
	getMaxValIndex,
	hLine2rgba,
	ImgRect,
	ImgSize,
	mustBeNotNull,
	sumCol2rgba,
	sumRow2rgba,
	vLine2rgba,
} from './utils.js'

const imgs = [
	// { fpath: 'a0.jpg', type: 'screenshot' },
	// { fpath: 'a1.webp', type: 'screenshot' },
	// { fpath: 'a2.webp', type: 'screenshot' },
	// { fpath: 'a3.webp', type: 'screenshot' },
	// { fpath: 'a4.webp', type: 'screenshot' },
	{ fpath: 'vid0_h.jpg', type: 'frame' },
].map(({ fpath, type }) => {
	const img = new Image()
	img.src = 'test-imgs/' + fpath
	return new Promise((res, rej) => {
		img.onload = () => res({ img, type })
		img.onerror = rej
	})
})
const font = new FontFace('Genshin', 'url(genshin.ttf)').load().then(font => {
	document.fonts.add(font)
})
await font

console.time('letters gen')
const symbolMasks = makeSymbolMasks([13, 14, 15, 16])
console.timeEnd('letters gen')

for (const imgPromise of imgs) {
	const { img, type } = await imgPromise

	const lineElem = document.createElement('div')
	document.body.appendChild(lineElem)

	if (type === 'screenshot') {
		const canvas = document.createElement('canvas')
		const sizeMinFrame = new ImgSize(480, 270)
		downscaleImg(img, canvas, sizeMinFrame)
		const sizeMin = new ImgSize(canvas.width, canvas.height)

		const rc = mustBeNotNull(canvas.getContext('2d'))
		const idata = rc.getImageData(0, 0, sizeMin.width, sizeMin.height)
		const imgMin = new Buffer2d(idata.data, 4, sizeMin.toRect(), sizeMin.width)

		{
			const card = locateArtifactCard(imgMin, true)
			const imgTitle = imgMin.view(card.titleRect)
			let mask = new Buffer2d(
				new Uint8ClampedArray(imgTitle.rect.area()),
				1,
				imgTitle.rect.toOrigin(),
				imgTitle.rect.toSize().width,
			)
			rgba2mask(imgTitle, mask, [255, 255, 255], [1, 1, 1], 1, 120)
			mask = maskShrink(mask, 127)
			document.body.appendChild(mask2canvas(mask).canvas)

			{
				const margin = 1
				const scale = mask.rect.toSize().height / 14 //sizeMin.width / img.naturalWidth
				const canvas = document.createElement('canvas')
				canvas.width = Math.ceil(mask.rect.toSize().width / scale) + margin * 2
				canvas.height = Math.ceil(mask.rect.toSize().height / scale) + margin * 2
				const rc = mustBeNotNull(canvas.getContext('2d'))
				rc.drawImage(
					img,
					-((card.titleRect.iFrom + mask.rect.iFrom) / scale) + margin,
					-((card.titleRect.jFrom + mask.rect.jFrom) / scale) + margin,
					sizeMin.width / scale,
					sizeMin.height / scale,
				)
				document.body.appendChild(canvas)

				{
					const idata = rc.getImageData(0, 0, canvas.width, canvas.height)
					const img = new Buffer2d(
						idata.data,
						4,
						new ImgRect(0, idata.width, 0, idata.height),
						idata.width,
					)
					let mask = new Buffer2d(
						new Uint8ClampedArray(img.rect.area()),
						1,
						img.rect.toOrigin(),
						img.rect.toSize().width,
					)
					rgba2mask(img, mask, [255, 255, 255], [1, 1, 1], 1, 80)
					mask = maskShrink(mask, 200)
					{
						const { canvas } = mask2canvas(mask)
						document.body.appendChild(canvas)
					}

					console.time('letter')
					const { text, chosenSymbols } = recognizeTextLine(mask, symbolMasks)
					console.timeEnd('letter')
					console.log(`[${text}]`)
					{
						mask.buf.fill(255)
						recognizedText2mask(mask, chosenSymbols)
						const { canvas } = mask2canvas(mask)
						document.body.appendChild(canvas)
					}
				}
			}
		}
	} else {
		const canvas = document.createElement('canvas')
		const sizeMinFrame = new ImgSize(512, 512)
		downscaleImg(img, canvas, sizeMinFrame)
		const sizeMin = new ImgSize(canvas.width, canvas.height)
		lineElem.appendChild(canvas)

		const ART_BODY_RGB = /**@type {import('./colors').RGB}*/ ([237, 230, 216])

		const rc = mustBeNotNull(canvas.getContext('2d'))
		const idata = rc.getImageData(0, 0, sizeMin.width, sizeMin.height)
		const imgMin = new Buffer2d(idata.data, 4, sizeMin.toRect(), sizeMin.width)
		{
			const img = imgMin
			const mask = new Buffer2d(
				new Uint8ClampedArray(img.rect.area()),
				1,
				img.rect,
				img.rect.toSize().width,
			) //TODO: use external array
			rgba2mask(img, mask, ART_BODY_RGB, [1, 1, 1], 2, 256)
			maskVLinesSobelD1(mask, 0.01)
			lineElem.appendChild(mask2canvas(mask).canvas)
			fastHoughTransform(mask)
			lineElem.appendChild(mask2canvas(mask).canvas)
		}
	}
}

/**
 * @param {Buffer2d<Uint8ClampedArray,4>} img
 * @param {boolean} debug
 */
function locateArtifactCard(img, debug) {
	const ART_BODY_RGB = /**@type {import('./colors').RGB}*/ ([237, 230, 216])
	const LINE_SEARCH_OFFSET = 2

	const mask = new Buffer2d(new Uint8ClampedArray(img.rect.area()), 1, img.rect, img.rect.toSize().width) //TODO: use external array
	rgba2mask(img, mask, ART_BODY_RGB, [1, 1, 1], 10, 0)

	const dbg = debug ? mask2canvas(mask) : null
	if (dbg) document.body.appendChild(dbg.canvas)

	// left size
	const row = new Uint32Array(img.rect.toSize().width) //TODO: use external array
	maskVLinesDeltaSum(mask, row, LINE_SEARCH_OFFSET, -1, 0.01, 0.1)
	if (dbg) sumRow2rgba(dbg.img, row, 0.002)

	let leftX = getMaxValIndex(row)
	leftX = Math.round(getAvgPeakPosition(row, leftX, LINE_SEARCH_OFFSET * 2))
	if (dbg) vLine2rgba(dbg.img, leftX, [64, 220, 127])

	// right side
	row.fill(0)
	maskVLinesDeltaSum(mask, row, LINE_SEARCH_OFFSET, 1, 0.01, 0.1)
	if (dbg) sumRow2rgba(dbg.img, row, 0.002)

	let rightX = getMaxValIndex(row)
	rightX = Math.round(getAvgPeakPosition(row, rightX, LINE_SEARCH_OFFSET * 2))
	if (dbg) vLine2rgba(dbg.img, rightX, [0, 255, 0])

	// hiddle horiz line
	const col = new Uint32Array(img.rect.toSize().height) //TODO: use external array
	const artColMask = mask.view(new ImgRect(leftX, rightX, 0, img.rect.toSize().height))
	maskHLinesDeltaSum(artColMask, col, LINE_SEARCH_OFFSET, -1, 0.01, 0.5)
	if (dbg) sumCol2rgba(dbg.img, col, 0.002)

	let middleY = getMaxValIndex(col)
	middleY = Math.round(getAvgPeakPosition(col, middleY, LINE_SEARCH_OFFSET * 2))
	if (dbg) hLine2rgba(dbg.img, middleY, [255, 127, 0])

	if (dbg) dbg.canvas.getContext('2d')?.putImageData(dbg.idata, 0, 0)

	// title

	const extraBottomShrink = Math.round((rightX - leftX) / 3)
	const headerSearchRect = new ImgRect(leftX, rightX, 0, middleY - extraBottomShrink)
	const headerSearchImg = img.view(headerSearchRect).copy() //TODO: use external array
	const headerSearchMask = mask.view(headerSearchRect)

	rgba2hsla(headerSearchImg, headerSearchImg)
	rgba2mask(headerSearchImg, headerSearchMask, singleRgb2hsl([188, 107, 50]), [1, 1, 0], 5, 50)
	const dbg1 = debug ? mask2canvas(headerSearchMask) : null
	if (dbg1) document.body.appendChild(dbg1.canvas)

	col.fill(0)
	maskHLinesDeltaSum(headerSearchMask, col, LINE_SEARCH_OFFSET, -1, 0.01, 0.5)
	if (dbg1) sumCol2rgba(dbg1.img, col, 0.002)

	let headerTopY = getMaxValIndex(col)
	headerTopY = Math.round(getAvgPeakPosition(col, headerTopY, LINE_SEARCH_OFFSET * 2))
	if (dbg1) hLine2rgba(dbg1.img, headerTopY, [255, 127, 0])

	col.fill(0)
	maskHLinesDeltaSum(mask, col, LINE_SEARCH_OFFSET, 1, 0.01, 0.5)
	if (dbg1) sumCol2rgba(dbg1.img, col, 0.002)

	let headerBottomY = getMaxValIndex(col)
	headerBottomY = Math.round(getAvgPeakPosition(col, headerBottomY, LINE_SEARCH_OFFSET * 2))
	if (dbg1) hLine2rgba(dbg1.img, headerBottomY, [255, 127, 0])

	if (dbg1) dbg1.canvas.getContext('2d')?.putImageData(dbg1.idata, 0, 0)

	return {
		titleRect: new ImgRect(leftX, rightX, headerTopY, headerBottomY),
		headerRect: new ImgRect(leftX, rightX, headerBottomY, middleY),
		bodyRect: new ImgRect(leftX, rightX, middleY, img.rect.toSize().height),
	}
}

/**
 * @typedef {{
 *   symMask: import('./symbols').SymbolMask,
 *   symSize: import('./symbols').SymbolMask["sizes"][number],
 *   diff: number,
 *   i: number,
 *   j: number,
 * }} SymbolMatch
 */

/**
 * @param {Buffer2d<Uint8ClampedArray, 1>} mask
 * @param {import('./symbols').SymbolMask[]} symbolMasks
 */
function recognizeTextLine(mask, symbolMasks) {
	const maskWidth = mask.rect.toSize().width
	const chosenSymbols = /**@type {SymbolMatch[]}*/ ([])
	let dx = 0
	let dy = 0
	while (dx < maskWidth && !symbolsEndWithSpaces(chosenSymbols, 3)) {
		const best = /**@type {SymbolMatch}*/ ({
			symMask: symbolMasks[0],
			symSize: symbolMasks[0].sizes[0],
			diff: Infinity,
			i: 0,
			j: 0,
		})
		for (let maskI = 0; maskI < symbolMasks.length; maskI++) {
			const symMask = symbolMasks[maskI]
			for (let sizeI = 0; sizeI < symMask.sizes.length; sizeI++) {
				const size = symMask.sizes[sizeI]
				for (let i = -1; i <= 1; i++)
					for (let j = -1; j <= 1; j++) {
						const d = maskDiffSumOver(mask, size.mask, dx + i, dy + j) / size.mask.rect.area()
						if (d < best.diff) {
							best.diff = d
							best.symMask = symMask
							best.symSize = size
							best.i = i
							best.j = j
						}
					}
			}
		}
		if (best.diff === Infinity) break

		chosenSymbols.push(best)
		const shift = best.i + best.symSize.mask.rect.toSize().width
		dx += Math.max(shift, 1)
		dy += best.j
		if (dy < -2) dy = -2
		if (dy > 2) dy = 2
	}

	return { text: chosenSymbols.map(x => x.symMask.symbol).join(''), chosenSymbols }
}
/**
 * @param {SymbolMatch[]} chosenSymbols
 * @param {number} count
 */
function symbolsEndWithSpaces(chosenSymbols, count) {
	if (chosenSymbols.length < count) return false
	for (let i = 0; i < count; i++)
		if (chosenSymbols[chosenSymbols.length - count + i].symMask.symbol !== ' ') return false
	return true
}
/**
 *
 * @param {Buffer2d<Uint8ClampedArray,1>} mask
 * @param {SymbolMatch[]} chosenSymbols
 */
function recognizedText2mask(mask, chosenSymbols) {
	let dx = 0
	let dy = 0
	for (const chosen of chosenSymbols) {
		dx += chosen.i
		dy += chosen.j
		maskWriteOver(mask, chosen.symSize.mask, dx, dy)
		dx += chosen.symSize.mask.rect.toSize().width
	}
}
