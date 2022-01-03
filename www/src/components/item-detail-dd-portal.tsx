import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks'

import { useClickAway, useWindowSize } from '#src/api/hooks'
import { calcPosForDd } from '#src/utils/calc-pos-for-dd'
import { createPortal } from '#src/utils/preact-compat'

let modalsEl: Element | null = null

export const ItemDetailDdPortal = ({
	onClickAway,
	children,
	classes = '',
	targetEl,
	contentKey = null,
}: {
	onClickAway?(): void
	children: JSX.Nodes
	classes?: string
	targetEl: HTMLElement | null | undefined
	contentKey?: string | null | undefined
}): JSX.Element => {
	modalsEl ??= document.querySelector('.modals') as Element
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
		})
		;('bs-popover-top bs-popover-bottom')
		wrapEl.className = `${defClassName} bs-popover-${pos.layoutPosition.y}`
		wrapEl.style.left = `${Math.max(0, pos.left)}px`
		wrapEl.style.top = `${Math.max(0, pos.top)}px`
		setArrowStyle(
			`position: absolute; transform: translate3d(${wrapEl.offsetWidth / 2 - 8}px, 0, 0); left: 0`,
		)
	}, [wrapRef, targetEl, defClassName, setArrowStyle])
	useLayoutEffect(onResize)
	useWindowSize()
	useClickAway(wrapRef, onClickAway)
	//todo обновлять позицию, когда загрузилась картинка
	return createPortal(
		<div class={defClassName} ref={wrapRef}>
			{children}
			<div class="popover-arrow" style={arrowStyle}></div>
		</div>,
		modalsEl,
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
	modalsEl ??= document.querySelector('.modals') as Element
	const wrapRef: preact.RefObject<HTMLDivElement> | null = useRef(null)
	const defClassName = `fixed-bottom ${classes}`

	useClickAway(wrapRef, onClickAway)

	return createPortal(
		<div class={defClassName} ref={wrapRef}>
			{children}
		</div>,
		modalsEl,
	)
}