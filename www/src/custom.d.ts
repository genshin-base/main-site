declare namespace JSX {
	type Element = import('preact').JSX.Element
	type HTMLAttributes<RefType extends EventTarget = EventTarget> =
		import('preact').JSX.HTMLAttributes<RefType>
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

declare namespace NodeJS {
	interface ProcessEnv {
		NODE_ENV: 'development' | 'production'
	}
}

declare const BUNDLE_ENV: {
	ASSET_PATH: string
	LANGS: string[]
	LANG: string
	IS_SSR: boolean
	COMMIT_HASH: string
}
