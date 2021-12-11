import { assert as test } from 'chai'
import { optimizeTextItems } from './text_nodes.js'

function t(params, ...children) {
	const [kind, cls, href] = params.split(':')
	const item = { kind, class: cls || null, children }
	if (href) item.href = href
	return item
}

describe('optimizeTextItems', () => {
	function check(src, dest) {
		optimizeTextItems(src)
		test.deepEqual(src, dest)
	}
	function checkSame(srcFunc) {
		check(srcFunc(), srcFunc())
	}

	it('should unwrap simple spans', () => {
		check([t('span', 'abc')], ['abc'])
	})

	for (const kind of ['span', 'a', 'a::ya.ru']) {
		it(`should unwrap empty ${kind}`, () => {
			check([t(kind)], [])
		})
	}

	it('should unwrap children without classes', () => {
		check(
			[t('span', t('span', t('span:child0', 'text'), 'child1'), 'child2'), 'sibling'],
			[t('span', t('span:child0', 'text'), 'child1child2'), 'sibling'],
		)
		check(
			[t('a::ya.ru', t('span', t('span:child0', 'text'), 'child1'), 'child2'), 'sibling'],
			[t('a::ya.ru', t('span:child0', 'text'), 'child1child2'), 'sibling'],
		)
	})

	it('should unwrap and overwrite null/same class', () => {
		check(
			[t('p:cls', t('span', t('span:child0', 'text'), 'child1')), 'sibling'],
			[t('p:cls', t('span:child0', 'text'), 'child1'), 'sibling'],
		)
		check(
			[t('p', t('span:cls', t('span:child0', 'text'), 'child1')), 'sibling'],
			[t('p:cls', t('span:child0', 'text'), 'child1'), 'sibling'],
		)
		check(
			[t('p:cls', t('span:cls', t('span:child0', 'text'), 'child1')), 'sibling'],
			[t('p:cls', t('span:child0', 'text'), 'child1'), 'sibling'],
		)
	})

	describe('siblings', () => {
		it('should merge same', () => {
			check(['abc', 'def'], ['abcdef'])
			for (const tag of ['a:cls0:ya.ru', 'span:cls0'])
				check([t(tag, 'abc'), t(tag, 'def')], [t(tag, 'abcdef')])
		})
		it('should not merge p', () => {
			checkSame(() => [t('p:cls0', 'abc'), t('p:cls0', 'def')])
		})
		it('should not merge different', () => {
			checkSame(() => [t('span:cls0', 'abc'), t('span:cls1', 'def')])
			checkSame(() => [t('a::ya.ru', 'abc'), t('a::google.com', 'def')])
		})
	})

	for (let [to, from] of [
		['span', 'a'],
		['p', 'a'],
		['p:cls0', 'span:cls1'],
	]) {
		it(`sould not unwrap '${from}' to '${to}'`, () => {
			if (from === 'a') from += '::ya.ru'
			checkSame(() => [t(to, t(from, t('span:child0', 'text'), 'child1'))])
		})
	}

	it('should remove empty leading/trailing paragragps', () => {
		check([t('p'), t('p', 'qwe'), t('p')], [t('p', 'qwe')])
	})
})
