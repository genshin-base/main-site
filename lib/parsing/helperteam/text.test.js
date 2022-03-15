import { assert as test } from 'chai'
import { textNodesFromMarkdown, textNodesToMarkdown } from './text.js'

describe('textNodesToMarkdown', () => {
	it('should return markdown string', () => {
		/**
		 * @param {Parameters<typeof textNodesToMarkdown>[0]} src
		 * @param {string} dest
		 */
		function check(src, dest) {
			test.strictEqual(textNodesToMarkdown(src), dest)
		}
		check('', '')
		check([], '')
		check('bla', 'bla')
		check('foo\nbar', 'foo<br>\nbar')
		check({ b: 'bla' }, '**bla**')
		check({ i: 'bla' }, '_bla_')
		check({ s: 'bla' }, '~~bla~~')
		check({ a: 'bla', href: 'x.org' }, '[bla](x.org)')
		check({ p: 'bla' }, 'bla')
		check({ p: [{ b: 'foo' }, ' ', { i: 'bar' }] }, '**foo** _bar_')
		check([{ p: 'foo' }, { p: 'bar' }], 'foo\n\nbar')
		check([{ p: ['foo', { b: 'bar' }] }, { p: 'baz' }], 'foo**bar**\n\nbaz')
	})
})

describe('textNodesFromMarkdown', () => {
	it('should return text nodes', () => {
		const check = (src, dest) => test.deepEqual(textNodesFromMarkdown(src), dest)
		check('', [])
		check('bla', 'bla')
		check('foo<br>\nbar', 'foo\nbar')
		check('**bla**', { b: 'bla' })
		check('_bla_', { i: 'bla' })
		check('~~bla~~', { s: 'bla' })
		check('[bla](x.org)', { a: 'bla', href: 'x.org' })
		check('foo\n\nbar', [{ p: 'foo' }, { p: 'bar' }])
		check('foo**bar**\n\nbaz', [{ p: ['foo', { b: 'bar' }] }, { p: 'baz' }])
	})
})
