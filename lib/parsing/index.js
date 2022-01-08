/** @typedef {{code:string, name:Record<string,string>, rarity:import("#lib/genshin").GI_RarityCode}} CharacterData */
/** @typedef {Record<string,CharacterData>} Code2CharacterData */

/** @typedef {{code:string, name:Record<string,string>}} ArtifactData */
/** @typedef {Record<string,ArtifactData>} Code2ArtifactData */

/**
 * @typedef {{
 *   code: string,
 *   typeCode: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   primaryMaterialGroupCode: string,
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
 *   artifactCodes: string[],
 *   weaponMaterialGroupCodes: string[],
 * }} DomainData
 */
/** @typedef {Record<string,DomainData>} Code2DomainData */

/**
 * @typedef {{
 *   code: string,
 *   name: Record<string,string>,
 *   rarity: import("#lib/genshin").GI_RarityCode,
 *   craftedFromCode: string|null,
 *   craftGroupCode: string,
 *   isPrimary: true,
 * }} WeaponMaterialData
 */
/** @typedef {Record<string,WeaponMaterialData>} Code2WeaponMaterialData */

export const dummy = 42
