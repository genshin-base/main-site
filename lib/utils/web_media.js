/** @returns {Promise<boolean>} */
export function checkAvifSupport() {
	return new Promise(resolve => {
		const img = new Image()
		img.src =
			'data:image/avif;base64,AAAAGGZ0eXBhdmlmAAAAAG1pZjFtaWFmAAAA621ldGEAAAAAAAAAIWhkbHIAAAAAAAAAAHBpY3QAAAAAAAAAAAAAAAAAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABCwAAABYAAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgSAAAAAAABNjb2xybmNseAABAA0ABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB5tZGF0EgAKBzgADlAQ0GkyCRAAAAAP+j9P4w=='
		img.onload = () => resolve(true)
		img.onerror = () => resolve(false)
	})
}

/**
 * @param {HTMLImageElement} img
 * @returns {boolean}
 */
export function imgIsReady(img) {
	return img.complete && img.naturalWidth > 0
}
