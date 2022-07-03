import { useCallback } from 'preact/hooks'

import { useScrollPosition } from '#src/utils/hooks'
import { TOP_POINTING } from '#src/utils/typography'

export function GoUpBtn({ classes = '' }: { classes?: string }): JSX.Element | null {
	const onClick = useCallback(() => {
		window.scrollTo(0, 0)
	}, [])
	const scrollPos = useScrollPosition()
	if (scrollPos < 10) return null
	return (
		<button
			className={`btn rounded-circle lh-1 header-main-bg bottom-0 left-0 p-1 text-center m-1 ${classes} d-none d-md-block`}
			style={{ position: 'fixed' }}
			onClick={onClick}
		>
			<span>{TOP_POINTING}</span>
		</button>
	)
}
