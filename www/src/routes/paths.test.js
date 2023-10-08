import { assert as test } from 'chai'

import { matchPath, pathToStrings } from './paths.js'

describe('matchPath', () => {
	it('should not match anything if empty', () => {
		test.isNull(matchPath([], ''))
		test.isNull(matchPath([], '/'))
		test.isNull(matchPath([], '/smth'))
	})
	it('should match simple path', () => {
		test.deepEqual(matchPath([''], ''), {})
		test.deepEqual(matchPath([''], '/'), {})
		test.deepEqual(matchPath(['/home'], '/home'), {})
		test.deepEqual(matchPath(['/home'], '/home/'), {})
		test.deepEqual(matchPath(['/ho', 'me'], '/home'), {})
		test.isNull(matchPath(['/home'], '/home/me'))
	})
	it('should return props', () => {
		test.deepEqual(matchPath(['/home/', ['sub', ['a', 'b']]], '/home/a'), { sub: 'a' })
		test.deepEqual(matchPath(['/home/', ['sub', ['a', 'b']]], '/home/b'), { sub: 'b' })
		test.deepEqual(matchPath(['/home/', ['sub', ['a', 'b']]], '/home/b/'), { sub: 'b' })
		test.isNull(matchPath(['/home/', ['sub', ['a', 'b']]], '/home'))
		test.isNull(matchPath(['/home/', ['sub', ['a', 'b']]], '/home/b/smth'))
	})
})

describe('pathToStrings', () => {
	it('should return no paths for empty route', () => {
		test.deepEqual(pathToStrings('', []), [])
	})
	it('should return single path for simple route', () => {
		test.deepEqual(pathToStrings('', ['']), [''])
		test.deepEqual(pathToStrings('', ['/bla']), ['/bla'])
		test.deepEqual(pathToStrings('', ['/bla', '/sub']), ['/bla/sub'])
	})
	it('should return multiple paths for props', () => {
		test.deepEqual(pathToStrings('', ['/bla/', ['code', ['a', 'b']]]), ['/bla/a', '/bla/b'])
		test.deepEqual(
			pathToStrings('', ['/bla/', ['code', ['a', 'b']], '/', ['lang', ['ru', 'en']]]), //
			['/bla/a/ru', '/bla/a/en', '/bla/b/ru', '/bla/b/en'],
		)
	})
	it('should apply prefix', () => {
		test.deepEqual(
			pathToStrings('prefix', ['/bla/', ['code', ['a', 'b']]]), //
			['prefix/bla/a', 'prefix/bla/b'],
		)
	})
})
