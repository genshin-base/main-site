import { GI_REGION_CODES } from '#lib/genshin.js'

/**
 * @param {string} a
 * @param {string} b
 * @returns {-1|0|1}
 */
export function compareReleaseVersions(a, b) {
	if (a === b) return 0
	const aChunks = a.split('.')
	const bChunks = b.split('.')
	for (let i = 0; i < aChunks.length; i++) {
		const aNum = +aChunks[i]
		const bNum = +bChunks[i]
		if (aNum < bNum) return -1
		if (aNum > bNum) return 1
	}
	return 0
}

/**
 * @param {import('#lib/parsing').CharacterData|null|undefined} a
 * @param {import('#lib/parsing').CharacterData|null|undefined} b
 * @returns {number}
 */
export function compareCharacters(a, b) {
	if (!a || !b) return +!b - +!a
	return compareReleaseVersions(a.releaseVersion, b.releaseVersion) || a.code.localeCompare(b.code)
}
/**
 * @param {string[]} codes
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 */
export function sortCharacterCodes(codes, code2character) {
	return codes.sort((a, b) => compareCharacters(code2character[a], code2character[b]))
}
/**
 * @template T
 * @param {T[]} characters
 * @param {(item:T) => string} codeFunc
 * @param {import('#lib/parsing').Code2CharacterData} code2character
 * @returns {T[]}
 */
export function sortCharacters(characters, codeFunc, code2character) {
	return characters.sort((a, b) =>
		compareCharacters(code2character[codeFunc(a)], code2character[codeFunc(b)]),
	)
}

/**
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @returns {(aCode:string, bCode:string) => number}
 */
function makeItemCodesDomainRegionCompareFunc(code2domain) {
	const code2region = /**@type {Map<string,import('#lib/genshin').GI_RegionCode>}*/ (new Map())
	for (const domain of Object.values(code2domain)) {
		for (const code of domain.drop.itemCodes) code2region.set(code, domain.region)
	}
	return (aCode, bCode) => {
		const aRegion = code2region.get(aCode) ?? 'mondstadt'
		const bRegion = code2region.get(bCode) ?? 'mondstadt'
		return GI_REGION_CODES.indexOf(aRegion) - GI_REGION_CODES.indexOf(bRegion)
	}
}
/**
 * @template T
 * @param {T[]} items
 * @param {(item:T) => string} codeFunc
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @return {T[]}
 */
export function sortDomainItems(items, codeFunc, code2domain) {
	const compareRegions = makeItemCodesDomainRegionCompareFunc(code2domain)
	return items.sort((a, b) => {
		const aCode = codeFunc(a)
		const bCode = codeFunc(b)
		return compareRegions(aCode, bCode) || aCode.localeCompare(bCode)
	})
}
/** @type {import('#lib/parsing').ItemType[]} */
const characterMaterailTypesOrder = [
	'character-material-talent',
	'character-material-elemental-stone',
	'character-material-jewel',
	'character-material-local',
	'character-material-secondary',
]
/**
 * @template T
 * @param {T[]} items
 * @param {(item:T) => string} codeFunc
 * @param {import('#lib/parsing').Code2ItemData} code2item
 * @param {import('#lib/parsing').Code2DomainData} code2domain
 * @return {T[]}
 */
export function sortCharacterMaterialItems(items, codeFunc, code2item, code2domain) {
	/** @param {string} code */
	function getTypeIndex(code) {
		const item = code2item[code]
		for (let i = 0; i < characterMaterailTypesOrder.length; i++) {
			const type = characterMaterailTypesOrder[i]
			if (
				item.types.includes(type) &&
				!(type === 'character-material-talent' && item.types.includes('character-material-secondary'))
			) {
				const isCraftedFrom3 =
					type === 'character-material-talent' &&
					item.craftedFrom.length === 1 &&
					item.craftedFrom[0].count === 3
				// сначала книжки, потом - материалы еженедельных боссов
				return i * 2 + (isCraftedFrom3 ? 0 : 1)
			}
		}
		return -1
	}
	const compareRegions = makeItemCodesDomainRegionCompareFunc(code2domain)
	return items.sort((a, b) => {
		const aCode = codeFunc(a)
		const bCode = codeFunc(b)
		return (
			getTypeIndex(aCode) - getTypeIndex(bCode) ||
			compareRegions(aCode, bCode) ||
			aCode.localeCompare(bCode)
		)
	})
}
