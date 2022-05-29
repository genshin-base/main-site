import { assert as test } from 'chai'
import { limitLinesWidth } from './strings.js'

describe('limitLinesWidth', () => {
	it('should insert newlines', () => {
		const check = (text, dest) =>
			test.strictEqual(JSON.stringify(limitLinesWidth(text, 5)), JSON.stringify(dest))
		check('', '')
		check('a', 'a')
		check('a b', 'a b')
		check('a b c', 'a b c')
		check('a b c ', 'a b c')
		check('a b c d', 'a b c\nd')
		check('123456', '123456')
		check('1 23456', '1\n23456')
		check('123456 a b c d', '123456\na b c\nd')

		check('a\nb\nc\nd', 'a\nb\nc\nd')
		check('a\nb c d', 'a\nb c d')
		check('a\nb c d\ne', 'a\nb c d\ne')
		check('a\nb c d e', 'a\nb c d\ne')
	})
})
