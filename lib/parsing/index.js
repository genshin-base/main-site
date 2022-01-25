/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   materialCodes: string[],
 * }} CharacterData
 */
/** @typedef {Record<string,CharacterData>} Code2CharacterData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
 * }} ArtifactSetData
 */
/** @typedef {Record<string,ArtifactSetData>} Code2ArtifactSetData */

/**
 * @typedef {{
 *   code: string,
 *   typeCode: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
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
 *   location: [x:number, y:number],
 *   drop: {
 *     itemCodes: string[],
 *     artifactSetCodes: string[],
 *   },
 *   bossCode: string|null,
 * }} DomainData
 */
/** @typedef {Record<string,DomainData>} Code2DomainData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   types: string[],
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   craftedFrom: {code:string, count:number}[],
 *   locations: [x:number, y:number][],
 * }} ItemData
 */
/** @typedef {Record<string,ItemData>} Code2ItemData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   locations: [x:number, y:number][],
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
 *   locations: [x:number, y:number][]
 * }} EnemyGroupData
 */
/** @typedef {Record<string,EnemyGroupData>} Code2EnemyGroupData */

export {}
