/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   weaponTypeCode: import("#lib/genshin").GI_WeaponTypeCode,
 *   releaseVersion: string,
 *   materialCodes: string[],
 * }} CharacterData
 */
/** @typedef {Record<string,CharacterData>} Code2CharacterData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   sets: {1:Record<string,string>} | {2:Record<string,string>, 4:Record<string,string>},
 * }} ArtifactSetData
 */
/** @typedef {Record<string,ArtifactSetData>} Code2ArtifactSetData */

/**
 * @typedef {{
 *   code: string,
 *   typeCode: import("#lib/genshin").GI_WeaponTypeCode,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   atk: {base:number, max:number},
 *   subStat: {code:string, base:number, max:number} | null,
 *   specialAbility: Record<string,string>,
 *   materialCodes: string[],
 *   obtainSources: import("#lib/genshin").GI_WeaponObtainSource[],
 * }} WeaponData
 */
/** @typedef {Record<string,WeaponData>} Code2WeaponData */

/** @typedef {'artifacts'|'weapons'|'talents'|'trounce'} DomainTypeCode */
/**
 * @typedef {{
 *   code: string,
 *   type: DomainTypeCode,
 *   name: Record<string,string>,
 *   region: import("#lib/genshin").GI_RegionCode,
 *   location: import("#lib/genshin").MapLocation,
 *   drop: {
 *     itemCodes: string[],
 *     artifactSetCodes: string[],
 *   },
 *   bossCode: string|null,
 *   dropTimetable: Partial<Record<import("#lib/genshin").WeekdayCode, {itemCodes:string[]}>>,
 * }} DomainData
 */
/** @typedef {Record<string,DomainData>} Code2DomainData */

/**
 * @typedef {'currency'|'ingredient'|'fish'
 *   |'character-material-jewel'|'character-material-elemental-stone'
 *   |'character-material-secondary'|'character-material-local'|'character-material-talent'
 *   |'weapon-material-primary'|'weapon-material-secondary'
 * } ItemType
 */
/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   types: ItemType[],
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   craftedFrom: {code:string, count:number}[],
 *   locations: import("#lib/genshin").MapLocation[],
 * }} ItemData
 */
/** @typedef {Record<string,ItemData>} Code2ItemData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   locations: import("#lib/genshin").MapLocation[],
 *   drop: {
 *     itemCodes: string[],
 *     artifactSetCodes: string[],
 *   },
 * }} EnemyData
 */
/** @typedef {Record<string,EnemyData>} Code2EnemyData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   iconEnemyCode: string,
 *   enemyCodes: string[],
 *   locations: import("#lib/genshin").MapLocation[]
 * }} EnemyGroupData
 */
/** @typedef {Record<string,EnemyGroupData>} Code2EnemyGroupData */

export {}
