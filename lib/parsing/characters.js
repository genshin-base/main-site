/**
 * @param {string} name
 */
export function getCharacterCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s/g, '-')
}
