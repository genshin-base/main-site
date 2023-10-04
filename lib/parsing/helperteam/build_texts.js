/**
 * @template {import('./types').LangMode} TIn
 * @template {import('./types').LangMode} TOut
 * @param {import('./types').CharacterBuildInfo<TIn>} character
 * @param {TOut} _mode
 * @param {((val:import('./types').LangsIf<TIn, import('./text').CompactTextParagraphs|null>) =>
 *   import('./types').LangsIf<TOut, import('./text').CompactTextParagraphs|null>)} mapFunc
 * @returns {import('./types').CharacterBuildInfo<TOut>}
 */
export function buildCharacterConvertLangMode(character, _mode, mapFunc) {
	return {
		...character,
		credits: mapFunc(character.credits),
		roles: character.roles.map(role => ({
			...role,
			name: mapFunc(role.name),
			artifacts: {
				...role.artifacts,
				sets: role.artifacts.sets.map(set => ({ ...set, notes: mapFunc(set.notes) })),
				notes: mapFunc(role.artifacts.notes),
			},
			weapons: {
				...role.weapons,
				advices: role.weapons.advices.map(x => ({
					...x,
					similar: x.similar.map(x => ({ ...x, notes: mapFunc(x.notes) })),
				})),
				notes: mapFunc(role.weapons.notes),
			},
			mainStats: {
				...role.mainStats,
				sands: { ...role.mainStats.sands, notes: mapFunc(role.mainStats.sands.notes) },
				circlet: { ...role.mainStats.circlet, notes: mapFunc(role.mainStats.circlet.notes) },
				goblet: { ...role.mainStats.goblet, notes: mapFunc(role.mainStats.goblet.notes) },
				notes: mapFunc(role.mainStats.notes),
			},
			subStats: {
				...role.subStats,
				advices: role.subStats.advices.map(x => ({ ...x, notes: mapFunc(x.notes) })),
				notes: mapFunc(role.subStats.notes),
			},
			talents: {
				...role.talents,
				notes: mapFunc(role.talents.notes),
			},
			tips: mapFunc(role.tips),
			notes: mapFunc(role.notes),
		})),
	}
}

/**
 * @template {import('./types').LangMode} TIn
 * @template {import('./types').LangMode} TOut
 * @param {import('./types').BuildInfo<TIn>} builds
 * @param {TOut} _mode
 * @param {((val:import('./types').LangsIf<TIn, import('./text').CompactTextParagraphs|null>) =>
 *   import('./types').LangsIf<TOut, import('./text').CompactTextParagraphs|null>)} mapFunc
 * @returns {import('./types').BuildInfo<TOut>}
 */
export function buildsConvertLangMode(builds, _mode, mapFunc) {
	return {
		...builds,
		characters: builds.characters.map(char => buildCharacterConvertLangMode(char, _mode, mapFunc)),
	}
}

/**
 * @template {import('./types').LangMode} TIn
 * @param {import('./types').CharacterBuildInfoRole<TIn>} role
 * @returns {Generator<[import('./types').LangsIf<TIn, import('./text').CompactTextParagraphs|null>, string], void, void>}
 */
function* getCharacterBuildRoleFormattedBlocks(role) {
	yield [role.name, `name`]

	for (const [i, set] of role.artifacts.sets.entries()) yield [set.notes, `artifacts.sets.${i}.notes`]
	yield [role.artifacts.notes, `artifacts.notes`]

	for (const [i, advice] of role.weapons.advices.entries())
		for (const [j, similar] of advice.similar.entries())
			yield [similar.notes, `weapons.advices.${i}.similar.${j}.notes`]
	yield [role.weapons.notes, 'weapons.notes']

	yield [role.mainStats.sands.notes, 'mainStats.sands.notes']
	yield [role.mainStats.circlet.notes, 'mainStats.circlet.notes']
	yield [role.mainStats.goblet.notes, 'mainStats.goblet.notes']
	yield [role.mainStats.notes, 'mainStats.notes']

	for (const [i, advice] of role.subStats.advices.entries())
		yield [advice.notes, `subStats.advices.${i}.notes`]
	yield [role.subStats.notes, 'subStats.notes']

	yield [role.talents.notes, 'talents.notes']

	yield [role.tips, 'tips']
	yield [role.notes, 'notes']
}

/**
 * @template {import('./types').LangMode} TIn
 * @param {import('./types').CharacterBuildInfo<TIn>} character
 * @returns {Generator<[import('./types').LangsIf<TIn, import('./text').CompactTextParagraphs|null>, string], void, void>}
 */
export function* getCharacterBuildFormattedBlocks(character) {
	yield [character.credits, 'credits']
	for (const role of character.roles) {
		for (const [item, path] of getCharacterBuildRoleFormattedBlocks(role))
			yield [item, `roles.#${role.code.replace(/\s/g, '_')}.${path}`] //TODO: better role code
	}
}

/**
 * @template {import('./types').LangMode} TIn
 * @param {import('./types').BuildInfo<TIn>} builds
 * @returns {Generator<[import('./types').LangsIf<TIn, import('./text').CompactTextParagraphs|null>, string], void, void>}
 */
export function* getBuildsFormattedBlocks(builds) {
	for (const character of builds.characters) {
		for (const [item, path] of getCharacterBuildFormattedBlocks(character))
			yield [item, `characters.#${character.code}.${path}`]
	}
}
