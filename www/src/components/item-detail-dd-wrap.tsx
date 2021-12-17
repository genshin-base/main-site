import { useLayoutEffect, useRef, useState } from 'preact/hooks'

import { useClickAway } from '#src/api/hooks'
import { calcPosForDd } from '#src/utils/calc-pos-for-dd'
import { createPortal } from '#src/utils/preact-compat'

let modalsEl: Element | null = null

export const ItemDetailDdWrap = ({
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
	const defClassName = `popover fade show mw-xl-75 ${classes}`
	const [arrowStyle, setArrowStyle] = useState('')
	useLayoutEffect(() => {
		if (!wrapRef.current) return
		if (!targetEl) return
		const wrapEl = wrapRef.current
		const pos = calcPosForDd(targetEl.getBoundingClientRect(), wrapEl.getBoundingClientRect(), {
			isAbsolute: true,
			isCentered: true,
		})
		;('bs-popover-top bs-popover-bottom')
		wrapEl.className = `${defClassName} bs-popover-${pos.layoutPosition.y}`
		wrapEl.style.left = `${pos.left}px`
		wrapEl.style.top = `${pos.top}px`
		setArrowStyle(
			`position: absolute; transform: translate3d(${wrapEl.offsetWidth / 2 - 8}px, 0, 0); left: 0`,
		)
	}, [wrapRef, targetEl, defClassName, contentKey, setArrowStyle])
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
