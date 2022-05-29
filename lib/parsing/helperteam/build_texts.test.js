import { assert as test } from 'chai'
import { buildsConvertLangMode, getBuildsFormattedBlocks } from './build_texts.js'

describe('lang conversion and lang blocks consistency', () => {
	it('should return same blocks', () => {
		/** @type {import('./types').BuildInfo<'monolang'>} */
		const builds = {
			characters: [
				{
					code: 'amber',
					elementCode: 'pyro',
					roles: [
						{
							code: 'support',
							name: null,
							isRecommended: true,
							weapons: {
								advices: [
									{
										similar: [
											{
												code: 'elegy-for-the-end',
												refine: null,
												stacks: null,
												notes: null,
												seeCharNotes: false,
											},
										],
									},
								],
								notes: null,
								seeCharNotes: false,
							},
							artifacts: {
								sets: [
									{
										arts: { code: 'noblesse-oblige', count: 4 },
										notes: null,
										seeCharNotes: false,
									},
								],
								notes: null,
								seeCharNotes: false,
							},
							mainStats: {
								circlet: { codes: ['crit-rate'], notes: null, seeCharNotes: false },
								goblet: { codes: ['pyro-dmg'], notes: null, seeCharNotes: false },
								sands: { codes: ['er', 'atk%'], notes: null, seeCharNotes: false },
								notes: null,
								seeCharNotes: false,
							},
							subStats: {
								advices: [{ codes: ['er'], notes: null, seeCharNotes: false }],
								notes: null,
								seeCharNotes: false,
							},
							talents: { advices: ['burst', 'skill'], notes: null, seeCharNotes: false },
							tips: null,
							notes: null,
						},
					],
					credits: null,
				},
			],
		}

		const labeledBuilds = buildsConvertLangMode(builds, 'multilang', () => ({ path: '???' }))
		const pathsA = []
		for (const [block, path] of getBuildsFormattedBlocks(labeledBuilds)) {
			block.path = path
			pathsA.push(path)
		}
		const pathsB = []
		buildsConvertLangMode(labeledBuilds, 'multilang', block => {
			pathsB.push(block.path)
			return block
		})
		test.strictEqual(pathsA.join('\n'), pathsB.join('\n'))
	})
})
