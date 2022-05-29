let modalsEl: Element | undefined
export function GET_MODALS_EL(): Element {
	return (modalsEl ??= document.querySelector('.modals') as Element)
}

export const stopPropagation = e => e.stopPropagation()
