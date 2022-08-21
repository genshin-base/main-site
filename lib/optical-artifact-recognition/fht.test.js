import { assert as test } from 'chai'
import { fastHoughTransform } from './fht.js'
import { Buffer2d, ImgRect } from './utils.js'

describe('fastHoughTransform', () => {
	/** @param {TemplateStringsArray} str */
	function str2mat([str]) {
		const arr = str
			.trim()
			.replaceAll('.', '0')
			.split(/\s+/)
			.map(x => parseInt(x, 36))
		const h = str
			.trim()
			.split(/\n+/)
			.filter(x => x.trim() !== '').length
		const w = arr.length / h
		if (w % 1 !== 0) throw new Error(`wrong matrix str (items:${arr.length}, height:${h})`)
		return new Buffer2d(new Uint8ClampedArray(arr), 1, new ImgRect(0, w, 0, h), w)
	}
	/** @param {Buffer2d<Uint8ClampedArray,1>} src */
	function mat2str(src) {
		const lines = []
		for (let j = 0; j < Math.ceil(src.buf.length / src.stride); j++) {
			const bufLine = src.buf.slice(j * src.stride, (j + 1) * src.stride)
			if (j % 4 === 0) lines.push('')
			lines.push(
				Array.from(bufLine, (x, i) => (i % 4 === 0 ? '  ' : '') + x.toString(36).toUpperCase())
					.join(' ')
					.trim(),
			)
		}
		return lines.join('\n').trim()
	}
	/**
	 * @param {Buffer2d<Uint8ClampedArray,1>} src
	 * @param {Buffer2d<Uint8ClampedArray,1>} dest
	 */
	function check(src, dest) {
		test.strictEqual(mat2str(fastHoughTransform(src)), mat2str(dest))
	}

	it('simple', () => {
		check(str2mat`0`, str2mat`0`)
		// check(str2mat`0 0`, str2mat`0 0`)
		check(str2mat`0 0\n0 0`, str2mat`0 0\n0 0`)
		check(str2mat`0 0\n1 1`, str2mat`0 1\n2 1`)
		check(
			str2mat`
				0 0 0 0
				1 1 0 0
				0 0 1 1
				0 0 0 0`,
			str2mat`
				0 0 2 2
				2 4 2 1
				2 0 0 0
				0 0 0 1`,
		)
	})

	it('wiki', () => {
		// https://ru.wikipedia.org/wiki/Быстрое_преобразование_Хафа
		// https://upload.wikimedia.org/wikipedia/commons/7/77/FHT_Pyramid.png
		check(
			str2mat`
		. . . .   . . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . .
		
		. . . .   8 . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . .
		
		1 1 . .   . . . .   . . . .   . . . .
		. . 2 1   1 1 . .   . . . .   . . . .
		. . . .   . . 1 1   . . . .   . . . .
		. . . .   . . . .   1 1 . .   . . . .
		
		. . . .   . . . .   . . 1 1   1 1 . .
		. . . .   . . . .   . . . .   . . 1 1
		. . . .   . . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . .`,
			str2mat`
		. . . .   . . . .   . . . .   . 1 A 9
		. . . .   . . . .   . . 8 8   9 A 1 1
		. . . .   . . 8 8   8 8 0 2   2 2 1 2
		. . 8 8   8 8 . .   . . 2 2   2 2 3 2
		
		8 8 . .   . . . .   . 2 2 2   3 2 3 2
		. . . .   . . . .   2 4 4 4   3 2 1 1
		. . . .   . . . 4   6 4 4 2   2 2 1 1
		. . . .   . . 8 8   6 4 2 2   3 3 3 3
		
		2 2 4 4   9 H 9 5   3 3 3 3   1 1 1 1
		5 5 5 9   8 . . .   . . . .   . . . .
		2 4 4 4   . . . .   . . . .   . . . .
		2 4 4 .   . . . .   . . . .   . . . .
		
		4 2 . .   . . . .   . . . .   . . . .
		2 . . .   . . . .   . . . .   . . . .
		. . . .   . . . .   . . . .   . . . 1
		. . . .   . . . .   . . . .   . . 1 2`,
		)
	})
})
