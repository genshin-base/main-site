/** @typedef {{code:string, name:Record<string,string>, rarity:import("#lib/genshin").GI_RarityCode}} CharacterData */
/** @typedef {Record<string,CharacterData>} Code2CharacterData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode
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
 * }} WeaponData
 */
/** @typedef {Record<string,WeaponData>} Code2WeaponData */

/** @typedef {'artifacts'|'weapons'|'talents'} DomainTypeCode */
/**
 * @typedef {{
 *   code: string,
 *   type: DomainTypeCode,
 *   name: Record<string,string>,
 *   location: [number, number],
 *   dropItemCodes: string[],
 *   dropArtifactSetCodes: string[]
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
 * }} ItemData
 */
/** @typedef {Record<string,ItemData>} Code2ItemData */

export {}
