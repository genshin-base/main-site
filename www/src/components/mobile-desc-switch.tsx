import { BS_isBreakpointLessThen } from '#src/utils/bootstrap'
import { useWindowSize } from '#src/utils/hooks'

//переключалка для мобильного и десктопного вида
export function MobileDesktopSwitch({
	childrenDesktop,
	childrenMobile,
}: {
	childrenDesktop: JSX.Element | null
	childrenMobile: JSX.Element | null
}): JSX.Element | null {
	const windowSize = useWindowSize()
	return BS_isBreakpointLessThen(windowSize.breakpoint, 'xl') ? childrenMobile : childrenDesktop
}
