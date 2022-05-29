// bootstrap edition
export function calcPosForDd(
	parentRect: DOMRect,
	ddRect: DOMRect,
	{ isAbsolute = false, isCentered = false, shouldFitInScreen = false } = {},
): { top: number; left: number; layoutPosition: { x: 'end' | 'start'; y: 'top' | 'bottom' } } {
	const tWidth = window.innerWidth
	const tHeight = window.innerHeight
	const scrollTopFix = isAbsolute ? window.scrollY : 0
	const centredFix = isCentered ? (parentRect.width - ddRect.width) / 2 : 0
	let top = 0
	let left = 0
	let layoutPositionX: 'end' | 'start' = 'end'
	let layoutPositionY: 'top' | 'bottom' = 'bottom'
	if (parentRect.top + parentRect.height + ddRect.height < tHeight) {
		// to bottom
		top = parentRect.top + parentRect.height + scrollTopFix
		layoutPositionY = 'bottom'
	} else {
		// to top
		top = parentRect.top - ddRect.height + scrollTopFix
		layoutPositionY = 'top'
	}
	if (parentRect.left + ddRect.width + centredFix < tWidth) {
		// to right
		left = parentRect.left + centredFix
		layoutPositionX = 'end'
	} else {
		// to left
		left = parentRect.left + parentRect.width - ddRect.width - centredFix
		layoutPositionX = 'start'
	}
	if (shouldFitInScreen) {
		left = Math.min(Math.max(0, left), tWidth - ddRect.width)
		top = Math.max(top, 0)
	}
	return { top, left, layoutPosition: { y: layoutPositionY, x: layoutPositionX } }
}
