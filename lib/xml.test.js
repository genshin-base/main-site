import { assert as test } from 'chai'
import { Readable } from 'stream'
import { isNode, parseXmlStream } from './xml.js'

describe('parseXmlStream', () => {
	async function reparse(src, dest) {
		const stream = Readable.from([src])
		const root = await parseXmlStream(stream)

		const res = (function iter(children) {
			return children
				.map(node => {
					if (!isNode(node)) return node
					const attrs = Object.entries(node.attrs)
						.map(([k, v]) => `${k}="${v}"`)
						.join(' ')
					return `<${node.tag}${attrs ? ' ' : ''}${attrs}>` + iter(node.children) + `</${node.tag}>`
				})
				.join('')
		})(root.children)
		test.strictEqual(res, dest.trim())
	}

	it('should parse', async () => {
		const same = html => reparse(html, html)
		await same('')
		await same('<div>1</div>')
		await same('<div>1<span>2</span>3</div>')
	})

	describe('bad layout fixes', () => {
		it('should apply browser-like fixes', async () => {
			await reparse('<div>1<a>2</div>', '<div>1<a>2</a></div>')
			await reparse('<a>1<div>2</a>', '<a>1</a><div><a>2</a></div>')
			await reparse('<a>1<div>2</a><h1>3</h1>', '<a>1</a><div><a>2</a><h1>3</h1></div>')
			await reparse('<span>0<a>1<div>2</a>3</span>', '<span>0<a>1</a><div><a>2</a>3</div></span>')
			await reparse(
				'<span>0<a>1<div>2</a>3</span>4<h1>5</h1>',
				'<span>0<a>1</a><div><a>2</a>34<h1>5</h1></div></span>',
			)
			await reparse(
				'<h1>0<a>1<div>2</a>3</h1>4<h2>5</h2>',
				'<h1>0<a>1</a><div><a>2</a>3</div></h1>4<h2>5</h2>',
			)
		})
	})
})
