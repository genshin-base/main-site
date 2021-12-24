/** @typedef {Record<string,Record<string,string>>} ItemsLangNames */

/** @typedef {{code:string, name:Record<string,string>, rarity:import("#lib/genshin").GI_RarityCode}} CharacterInfo */
/** @typedef {Record<string,CharacterInfo>} CharactersInfo */

/** @typedef {{code:string, typeCode:string, name:Record<string,string>, rarity:import("#lib/genshin").GI_RarityCode}} WeaponInfo */
/** @typedef {Record<string,WeaponInfo>} WeaponsInfo */

/** @typedef {{type:string, name:Record<string,string>, location:[number, number]}} DomainInfo */
/** @typedef {Record<string,DomainInfo>} DomainsInfo */

export const dummy = 42
