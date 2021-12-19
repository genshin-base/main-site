export type BS_BreakpointCode = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl'
export const BS_BreakpointsCodes: BS_BreakpointCode[] = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl']

export const BS_BreakpointsMap = { xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 }
export function BS_getCurrBreakpoint(screenWidth: number): BS_BreakpointCode {
	return (
		//todo правильные типы
		(Object.keys(BS_BreakpointsMap).find(k => screenWidth < BS_BreakpointsMap[k]) as BS_BreakpointCode) ||
		('xxl' as BS_BreakpointCode)
	)
}
export function BS_isBreakpointLessThen(br: BS_BreakpointCode, targetBr: BS_BreakpointCode): boolean {
	return BS_BreakpointsCodes.indexOf(br) <= BS_BreakpointsCodes.indexOf(targetBr)
}
