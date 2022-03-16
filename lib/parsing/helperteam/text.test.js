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
		check('(foo) [bar] _baz*', '(foo) \\[bar\\] \\_baz\\*')

		check({ b: 'bla' }, '**bla**')
		check({ i: 'bla' }, '_bla_')
		check({ s: 'bla' }, '~~bla~~')
		check({ a: 'bla', href: 'x.org' }, '[bla](x.org)')

		check({ p: 'bla' }, 'bla')
		check({ p: [{ b: 'foo' }, ' ', { i: 'bar' }] }, '**foo** _bar_')
		check([{ p: 'foo' }, { p: 'bar' }], 'foo\n\nbar')
		check([{ p: ['foo', { b: 'bar' }] }, { p: 'baz' }], 'foo**bar**\n\nbaz')

		check({ artifact: 'foo', code: 'art' }, '[foo](#artifact:art)')
		check({ weapon: 'foo', code: 'weap' }, '[foo](#weapon:weap)')
		check({ item: 'foo', code: 'item' }, '[foo](#item:item)')

		check([{ b: 'foo' }, { b: 'bar' }], '**foobar**')
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

		check('[foo](#artifact:art)', { artifact: 'foo', code: 'art' })
		check('[foo](#weapon:weap)', { weapon: 'foo', code: 'weap' })
		check('[foo](#item:item)', { item: 'foo', code: 'item' })

		check('- list item', '- list item\n')
		check('* list item', '- list item\n')
		check('- list item<br>', '- list item\n\n')
		check('2. list item\n3. second', '2. list item\n3. second\n')
	})
})
