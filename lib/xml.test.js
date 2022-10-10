import { assert as test } from 'chai'
import { queryNodes } from './xml.js'

describe('queryNodes', () => {
	/**
	 * @param {import('./xml').NodeOrText} node
	 * @param {string} selector
	 */
	function query(node, selector) {
		return [...queryNodes(node, selector)]
	}
	/**
	 * @param {string} name
	 * @param {Record<string,string>} attrs
	 * @param {import('./xml').Node[]} children
	 * @returns {import('./xml').Node}
	 */
	function tag(name, attrs = {}, children = []) {
		return { tag: name, attrs, children }
	}

	it('should match nodes by tag name', () => {
		test.deepEqual(query('root', 'bla'), [])

		const div = tag('div')
		test.deepEqual(query(div, 'bla'), [])
		test.deepEqual(query(div, 'div'), [div])

		const divSpanA = tag('div', {}, [tag('span', {}, [tag('a')])])
		test.deepEqual(query(divSpanA, 'div'), [divSpanA])
		test.deepEqual(query(divSpanA, 'span'), [divSpanA.children[0]])
		test.deepEqual(query(divSpanA, 'a'), [tag('a')])

		const divSpans = tag('div', {}, [tag('span', {}), tag('span', {})])
		test.deepEqual(query(divSpans, 'span'), divSpans.children)
	})

	it('should match nodes by id', () => {
		const links = [tag('a', { id: 'link' }), tag('a', { id: 'link' })]
		const root = tag('div', { id: 'root' }, [
			tag('span', { id: 'c0' }, [links[0]]),
			tag('span', { id: 'c1' }, [links[1]]),
		])
		test.deepEqual(query(root, '#root'), [root])
		test.deepEqual(query(root, '#c0'), [root.children[0]])
		test.deepEqual(query(root, '#c1'), [root.children[1]])
		test.deepEqual(query(root, '#link'), links)
	})

	it('should match nodes by class', () => {
		const links = [tag('a', { class: 'link' }), tag('a', { class: 'link' })]
		const root = tag('div', { class: 'root' }, [
			tag('span', { class: 'c0' }, [links[0]]),
			tag('span', { class: 'c1' }, [links[1]]),
		])
		test.deepEqual(query(root, '.root'), [root])
		test.deepEqual(query(root, '.c0'), [root.children[0]])
		test.deepEqual(query(root, '.c1'), [root.children[1]])
		test.deepEqual(query(root, '.link'), links)
	})

	it('should match nodes by tag, id and class', () => {
		const link = tag('a', { id: 'c0', class: 'link' })
		const root = tag('div', {}, [
			tag('span', { id: 'c0', class: 'red' }),
			tag('span', { id: 'c1', class: 'green' }, [link]),
		])
		test.deepEqual(query(root, 'a.link'), [link])
		test.deepEqual(query(root, 'a#c0'), [link])
		test.deepEqual(query(root, 'span#c0'), [root.children[0]])
		test.deepEqual(query(root, '#c0.link'), [link])
		test.deepEqual(query(root, '.link#c0'), [link])
		test.deepEqual(query(root, 'a.link#c0'), [link])
	})

	it('should support descendant combinator', () => {
		const subChild = tag('a', { id: 'sub-child', class: 'node' })
		const root = tag('div', { id: 'root', class: 'node' }, [
			tag('span', { id: 'child', class: 'node' }, [subChild]),
		])
		test.deepEqual(query(root, '.node'), [root, root.children[0], subChild])
		test.deepEqual(query(root, '.node .node'), [root.children[0], subChild])
		test.deepEqual(query(root, '.node    .node'), [root.children[0], subChild])
		test.deepEqual(query(root, '#child .node'), [subChild])
		test.deepEqual(query(root, '#root .node'), [root.children[0], subChild])
		test.deepEqual(query(root, '#child .node'), [subChild])
	})

	it('should support child combinator', () => {
		const subChild = tag('a', { id: 'sub-child', class: 'node' })
		const root = tag('div', { id: 'root', class: 'node' }, [
			tag('span', { id: 'child', class: 'node' }, [subChild]),
		])
		test.deepEqual(query(root, '.node'), [root, root.children[0], subChild])
		test.deepEqual(query(root, '.node > .node'), [root.children[0], subChild])
		test.deepEqual(query(root, '.node>.node'), [root.children[0], subChild])
		test.deepEqual(query(root, '#root > .node'), [root.children[0]])
	})
})
