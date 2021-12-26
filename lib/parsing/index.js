/** @typedef {Record<string,Record<string,string>>} ItemsLangNames */

/** @typedef {{code:string, name:Record<string,string>, rarity:import("#lib/genshin").GI_RarityCode}} CharacterData */
/** @typedef {Record<string,CharacterData>} Code2CharacterData */

/** @typedef {{code:string, typeCode:string, name:Record<string,string>, rarity:import("#lib/genshin").GI_RarityCode}} WeaponData */
/** @typedef {Record<string,WeaponData>} Code2WeaponData */

/** @typedef {{code:string, type:string, name:Record<string,string>, location:[number, number]}} DomainData */
/** @typedef {Record<string,DomainData>} Code2DomainData */

export const dummy = 42
