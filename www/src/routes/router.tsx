import { ComponentType, h, Ref } from 'preact'
import { useEffect, useState } from 'preact/hooks'

import { matchPath } from './paths'

export type RoutePath = readonly (string | readonly [name: string, variants: readonly string[]])[]

type Routes = [RoutePath, ComponentType][]

type SubRoute<T> = readonly [string, readonly T[]]
type EmptySubRoute = readonly [string, readonly []]
type PathProps<T extends RoutePath> = {
	[K in keyof T as T[K] extends EmptySubRoute
		? never
		: T[K] extends SubRoute<unknown>
		? T[K][0]
		: never]: T[K] extends SubRoute<infer A> ? A : never
} & {
	[K in keyof T as T[K] extends EmptySubRoute ? T[K][0] : never]?: undefined
}

const URL_LANG_PREFIX = BUNDLE_ENV.LANG === 'en' ? '' : '/ru'

function findRoutedComponent(routes: Routes, url: string): [ComponentType, Record<string, string>] | null {
	for (const [route, comp] of routes) {
		const props = matchPath(route, url)
		if (props) return [comp, props]
	}
	return null
}

function pathSearchHash(url: { pathname: string; search: string; hash: string }) {
	return url.pathname + url.search + url.hash
}

function handleAnchorClick(e: MouseEvent, routes: Routes) {
	if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.button !== 0) return

	const a = e.target instanceof Element && e.target.closest('a')
	if (a && a.href && (!a.target || a.target === '_self')) {
		const url = new URL(a.href)
		if (url.origin === location.origin) {
			if (findRoutedComponent(routes, url.pathname)) {
				if (pathSearchHash(location) !== pathSearchHash(url))
					history.pushState(null, '', pathSearchHash(url))
				e.preventDefault()
				return true
			}
		}
	}
}

export function useRouter(routes: Routes) {
	const [, forceUpdate] = useState(0)

	useEffect(() => {
		function onClick(e: MouseEvent) {
			const handled = handleAnchorClick(e, routes)
			if (handled) forceUpdate(x => x + 1)
		}
		function onPopState(e: PopStateEvent) {
			forceUpdate(x => x + 1)
		}
		addEventListener('click', onClick)
		addEventListener('popstate', onPopState)
		return () => {
			removeEventListener('click', onClick)
			removeEventListener('popstate', onPopState)
		}
	}, [routes])

	const res = findRoutedComponent(routes, location.pathname)
	if (!res) return '404'
	const [Comp, props] = res
	return <Comp {...props} />
}

export const route = <TPath extends RoutePath>(
	path: TPath,
	comp: ComponentType<PathProps<TPath>>,
): [RoutePath, ComponentType] => [[URL_LANG_PREFIX, ...path], comp as ComponentType]

export function A(
	props: JSX.HTMLAttributes<HTMLAnchorElement> & { ref?: Ref<typeof A>; innerRef?: Ref<HTMLAnchorElement> },
): JSX.Element {
	props = Object.assign({}, props)
	// @ts-ignore
	props.ref = props.innerRef
	delete props.innerRef
	if (props.href) props.href = URL_LANG_PREFIX + props.href
	// тайпскриптовый JSX-трансформер какой-то туповатый:
	// он для <a {...props}/> генерит лишний Object.assign({}, props)
	return h('a', props as Parameters<typeof h>[1])
}