import { assert as test } from 'chai'
import { json_extractText } from './text-json.js'

describe('json_extractText', () => {
	/**
	 * @param {import('#lib/google').ExtendedValue|null} userEnteredValue
	 * @param {import('#lib/google').TextFormat|null} defaultFormat
	 * @param {import('#lib/google').TextFormatRun[]|null} textFormatRuns
	 * @param {import('./text').CompactTextParagraphs} dest
	 */
	const checkDef = (userEnteredValue, defaultFormat, textFormatRuns, dest) =>
		test.deepEqual(
			json_extractText({
				...(userEnteredValue ? { userEnteredValue } : {}),
				...(defaultFormat ? { userEnteredFormat: { textFormat: defaultFormat } } : {}),
				...(textFormatRuns ? { textFormatRuns } : {}),
			}),
			dest,
		)
	/**
	 * @param {import('#lib/google').ExtendedValue|null} userEnteredValue
	 * @param {import('#lib/google').TextFormatRun[]|null} textFormatRuns
	 * @param {import('./text').CompactTextParagraphs} dest
	 */
	const check = (userEnteredValue, textFormatRuns, dest) =>
		checkDef(userEnteredValue, null, textFormatRuns, dest)

	it('should convert spreadsheet cell text to text nodes', () => {
		test.deepEqual(json_extractText(undefined), [])
		check(null, null, [])
		check({ boolValue: false }, null, [])
		check({ stringValue: '' }, null, [])

		check({ stringValue: 'bla' }, null, 'bla')
		check({ stringValue: 'bla' }, [], 'bla')

		check({ stringValue: 'bla' }, [{ format: { bold: true } }], { b: 'bla' })
		check({ stringValue: 'bla' }, [{ format: { italic: true } }], { i: 'bla' })
		check({ stringValue: 'bla' }, [{ format: { strikethrough: true } }], { s: 'bla' })
		check({ stringValue: 'bla' }, [{ format: { link: { uri: 'uri' } } }], { a: 'bla', href: 'uri' })
		check({ stringValue: 'bla' }, [{ format: { underline: true } }], 'bla')

		checkDef({ stringValue: 'bla' }, { bold: true }, [{ format: {} }], { b: 'bla' })
		checkDef({ stringValue: 'bla' }, { italic: true }, [{ format: {} }], { i: 'bla' })
		checkDef({ stringValue: 'bla' }, { strikethrough: true }, [{ format: {} }], { s: 'bla' })
		checkDef({ stringValue: 'bla' }, { underline: true }, [{ format: {} }], 'bla')

		checkDef(
			{ stringValue: 'foobarbaz' },
			{ bold: true },
			[
				{ format: {} },
				{ startIndex: 3, format: { italic: true } },
				{ startIndex: 6, format: { strikethrough: true, bold: false } },
			],
			[{ b: 'foo' }, { i: { b: 'bar' } }, { s: 'baz' }],
		)
	})

	describe('corrections', () => {
		it('should merge common styles', () => {
			check(
				{ stringValue: 'foobar' },
				[{ format: { bold: true, underline: true } }, { startIndex: 3, format: { bold: true } }],
				{ b: 'foobar' },
			)
			check(
				{ stringValue: 'foobar' },
				[{ format: { link: { uri: '0' } } }, { startIndex: 3, format: { link: { uri: '0' } } }],
				{ a: 'foobar', href: '0' },
			)
			check(
				{ stringValue: 'foobar' },
				[{ format: { link: { uri: '0' } } }, { startIndex: 3, format: { link: { uri: '1' } } }],
				[
					{ a: 'foo', href: '0' },
					{ a: 'bar', href: '1' },
				],
			)
		})

		describe('links', () => {
			it('should extend by words', () => {
				check(
					{ stringValue: 'foo bar baz' },
					[
						{ format: {} },
						{ startIndex: 5, format: { link: { uri: '0' } } },
						{ startIndex: 6, format: {} },
					],
					['foo ', { a: 'bar', href: '0' }, ' baz'],
				)
			})
			it('should extend by trailing punctuation', () => {
				check(
					{ stringValue: 'foo .bar. baz' },
					[
						{ format: {} },
						{ startIndex: 5, format: { link: { uri: '0' } } },
						{ startIndex: 8, format: {} },
					],
					['foo .', { a: 'bar.', href: '0' }, ' baz'],
				)
			})
			it('should extend by underlines', () => {
				check(
					{ stringValue: 'foo bar baz' },
					[
						{ format: { underline: true } },
						{ startIndex: 5, format: { link: { uri: '0' } } },
						{ startIndex: 6, format: { underline: true } },
					],
					{ a: 'foo bar baz', href: '0' },
				)
			})
			it('should extend by underlines (bug with extended underline)', () => {
				check(
					{ stringValue: 'foo bar baz' },
					[
						{ format: { link: { uri: '0' } } },
						{ startIndex: 3, format: { bold: true, underline: true } },
						{ startIndex: 6, format: { bold: true } },
					],
					[{ a: 'foo bar', href: '0' }, { b: ' baz' }],
				)
			})
		})
	})
})
