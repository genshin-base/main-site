import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks'

import { calcPosForDd } from '#src/utils/calc-pos-for-dd'
import { useClickAway, useWindowSize } from '#src/utils/hooks'
import { createPortal } from '#src/utils/preact-compat'
import { MODALS_EL } from '#src/utils/dom'

export const ItemDetailDdPortal = ({
	onClickAway,
	children,
	classes = '',
	targetEl,
	contentKey = null,
	shouldScrollToTop,
}: {
	onClickAway?(): void
	children: JSX.Nodes
	classes?: string
	targetEl: HTMLElement | null | undefined
	contentKey?: string | null | undefined
	shouldScrollToTop?: boolean
}): JSX.Element => {
	const wrapRef: preact.RefObject<HTMLDivElement> | null = useRef(null)
	const defClassName = `popover item-detail-popover ${classes}`
	const [arrowStyle, setArrowStyle] = useState('')
	const onResize = useCallback(() => {
		if (!wrapRef.current) return
		if (!targetEl) return
		const wrapEl = wrapRef.current
		const pos = calcPosForDd(targetEl.getBoundingClientRect(), wrapEl.getBoundingClientRect(), {
			isAbsolute: true,
			isCentered: true,
			shouldFitInScreen: true,
		})
		;('bs-popover-top bs-popover-bottom')
		wrapEl.className = `${defClassName} bs-popover-${pos.layoutPosition.y}`
		wrapEl.style.left = `${pos.left}px`
		wrapEl.style.top = `${pos.top}px`
		setArrowStyle(
			`position: absolute; transform: translate3d(${wrapEl.offsetWidth / 2 - 8}px, 0, 0); left: 0`,
		)
	}, [wrapRef, targetEl, defClassName, setArrowStyle])
	useLayoutEffect(onResize)
	useEffect(() => {
		if (!shouldScrollToTop) return
		const wrapEl = wrapRef.current
		if (!wrapEl) return
		const elTop = wrapEl.getBoundingClientRect().top
		if (elTop < 0) scrollTo(0, scrollY + elTop)
	})
	useWindowSize()
	useClickAway(wrapRef, onClickAway)
	//todo обновлять позицию, когда загрузилась картинка
	return createPortal(
		<div class={defClassName} ref={wrapRef}>
			{children}
			<div class="popover-arrow" style={arrowStyle}></div>
		</div>,
		MODALS_EL,
	)
}
export const ItemDetailDdMobilePortal = ({
	onClickAway,
	children,
	classes = '',
	contentKey = null,
}: {
	onClickAway?(): void
	children: JSX.Nodes
	classes?: string
	contentKey?: string | null | undefined
}): JSX.Element => {
	const wrapRef: preact.RefObject<HTMLDivElement> | null = useRef(null)
	const defClassName = `fixed-bottom ${classes}`

	useClickAway(wrapRef, onClickAway)

	return createPortal(
		<div class={defClassName} ref={wrapRef}>
			{children}
		</div>,
		MODALS_EL,
	)
}
