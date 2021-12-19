declare namespace JSX {
	type Element = import('preact').JSX.Element
	type TargetedEvent<
		Target extends EventTarget = EventTarget,
		TypedEvent extends Event = Event,
	> = import('preact').JSX.TargetedEvent<Target, TypedEvent>
	type TargetedMouseEvent<Target extends EventTarget> = TargetedEvent<Target, MouseEvent>
	type TargetedKeyboardEvent<Target extends EventTarget> = TargetedEvent<Target, KeyboardEvent>

	type Node = Element | string | number
	type Nodes = Node | Node[] | Element[] | null
}
declare type Key = number | string

declare module '*.jpg'
declare module '*.png'
declare module '*.jpeg'
declare module '*.gif'
declare module '*.json'
