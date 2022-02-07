import { ComponentType } from 'preact'
import { useEffect, useState } from 'preact/hooks'

import { matchPath } from './paths'

export type RoutePath = readonly (string | readonly [name: string, variants: readonly string[]])[]

type Routes = [RoutePath, ComponentType][]

type PathProps<T extends RoutePath> = {
	[K in keyof T as T[K] extends readonly [string, string[]] ? T[K][0] : never]: T[K] extends readonly [
		string,
		string[],
	]
		? T[K][1][number]
		: never
}

function findRoutedComponent(routes: Routes, url: string): [ComponentType, Record<string, string>] | null {
	for (const [route, comp] of routes) {
		const props = matchPath(route, url)
		if (props) return [comp, props]
	}
	return null
}

function handleAnchorClick(e: MouseEvent, routes: Routes) {
	if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.button !== 0) return

	let elem = e.target
	while (elem instanceof Element) {
		if (elem instanceof HTMLAnchorElement) {
			if (!elem.target || elem.target === '_self') {
				const url = new URL(elem.href)
				if (findRoutedComponent(routes, url.pathname)) {
					history.pushState(null, '', url.pathname + url.search + url.hash)
					e.preventDefault()
					return true
				}
			}
		}
		elem = elem.parentElement
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

export const route = <TPath extends RoutePath, TProps extends PathProps<TPath>>(
	path: TPath,
	comp: ComponentType<TProps>,
): [RoutePath, ComponentType] => [[BUNDLE_ENV.LANG === 'en' ? '' : '/ru', ...path], comp as ComponentType]
