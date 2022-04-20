import { calcPosForDd } from '#src/utils/calc-pos-for-dd'
import { MODALS_EL } from '#src/utils/dom'
import { useWindowSize } from '#src/utils/hooks'
import { createPortal } from '#src/utils/preact-compat'
import { useCallback, useLayoutEffect, useRef, useState } from 'preact/hooks'

export function Tooltip({
	children,
	classes = '',
	targetEl,
}: {
	children: JSX.Node
	classes?: string
	targetEl: HTMLElement | null | undefined
}): JSX.Element {
	const wrapRef: preact.RefObject<HTMLDivElement> | null = useRef(null)
	const defClassName = `tooltip fade show ${classes}`
	const [arrowStyle, setArrowStyle] = useState<string>('')
	const onResize = useCallback(() => {
		if (!wrapRef.current) return
		if (!targetEl) return
		const wrapEl = wrapRef.current
		const pos = calcPosForDd(targetEl.getBoundingClientRect(), wrapEl.getBoundingClientRect(), {
			isAbsolute: true,
			isCentered: true,
		})
		;('bs-tooltip-top bs-tooltip-bottom')
		wrapEl.className = `${defClassName} bs-tooltip-${pos.layoutPosition.y}`
		wrapEl.style.left = `${Math.max(0, pos.left)}px`
		wrapEl.style.top = `${Math.max(0, pos.top)}px`
		setArrowStyle(
			`position: absolute; transform: translate3d(${wrapEl.offsetWidth / 2 - 8}px, 0, 0); left: 0`,
		)
	}, [wrapRef, targetEl, defClassName, setArrowStyle])
	useLayoutEffect(onResize)
	useWindowSize()
	//todo обновлять позицию, когда загрузилась картинка
	return createPortal(
		<div className={defClassName} ref={wrapRef}>
			<div className="tooltip-arrow" style={arrowStyle}></div>
			<div className="tooltip-inner">{children}</div>
		</div>,
		MODALS_EL,
	)
}
