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

declare global {
	interface WindowEventMap {
		'x-route-to': CustomEvent<{ path: string }>
	}
}

const URL_LANG_PREFIX = makeUrlLangPrefix(BUNDLE_ENV.LANG)

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

function tryRouteToPage(routes: Routes, url: URL) {
	if (url.origin === location.origin) {
		if (findRoutedComponent(routes, url.pathname)) {
			if (pathSearchHash(location) !== pathSearchHash(url)) {
				const hashChanged = url.hash !== location.hash
				history.pushState(null, '', pathSearchHash(url))
				if (hashChanged) dispatchEvent(new CustomEvent('x-local-hashchange'))
			}
			return true
		}
	}
	return false
}

function handleAnchorClick(e: MouseEvent, routes: Routes) {
	if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.button !== 0) return

	const a = e.target instanceof Element && e.target.closest('a')
	if (a && a.href && (!a.target || a.target === '_self')) {
		if (tryRouteToPage(routes, new URL(a.href))) {
			e.preventDefault()
			return true
		}
	}
	return false
}

export function useRouter(routes: Routes) {
	const [, forceUpdate] = useState(0)

	useEffect(() => {
		function onClick(e: MouseEvent) {
			const handled = handleAnchorClick(e, routes)
			if (handled) forceUpdate(x => x + 1)
		}
		function onRouteTo(e: WindowEventMap['x-route-to']) {
			const url = new URL(e.detail.path, location.href)
			if (tryRouteToPage(routes, url)) {
				forceUpdate(x => x + 1)
			} else {
				location.href = url.toString()
			}
		}
		function onPopState(e: PopStateEvent) {
			forceUpdate(x => x + 1)
		}
		// Тут обязательно слушать клик на боди, т.к. на window висит кривая гуглометрика,
		// которая при виде клика по <a> делает `location.href = a.href`, чем ломает
		// все роутерные переходы-без-перезагрузки.
		// Использовать onCapture тоже нельзя: в этом случае onlick какого-нибудь элмента
		// сработает после пеерключения страницы (т.е. когда элмента на странице уже нет),
		// это неторт (и предупреждение от preact/debug'а).
		// Сейчас же слушатель с боди срабатывает до метрики, проставляет `defaultPrevented`,
		// метрика о чём-то догадывается и не трогает location.
		document.body.addEventListener('click', onClick)
		addEventListener('x-route-to', onRouteTo)
		addEventListener('popstate', onPopState)
		return () => {
			document.body.removeEventListener('click', onClick)
			removeEventListener('x-route-to', onRouteTo)
			removeEventListener('popstate', onPopState)
		}
	}, [routes])

	const res = findRoutedComponent(routes, location.pathname)
	if (!res) return '404'
	const [Comp, props] = res
	console.log(Comp)
	return <Comp {...props} />
}

/**
 * Создаёт евент, который можно кинуть роутеру, чтоб тот перешёл на другую страницу.
 * Например:
 *   dispatchRouteTo('/path/to/page')
 * Тут бы логичнее выглядел какой-нибудь
 *   const goToPage = useRouterGoTo()
 *   goToPage('/path/to/page')
 * Но для этого всё внутри <App> надо оборачивать в провайдер, делать хуки с консьюмерами...
 * А тут кинул евент - и всё.
 */
export function dispatchRouteTo(path: string) {
	dispatchEvent(new CustomEvent('x-route-to', { detail: { path } }))
}

export const route = <TPath extends RoutePath>(
	path: TPath,
	comp: ComponentType<PathProps<TPath>>,
): [RoutePath, ComponentType] => [[URL_LANG_PREFIX, ...path], comp as ComponentType]

function makeUrlLangPrefix(lang: string): string {
	return lang === 'en' ? '' : '/ru'
}

export function isOnRoute(path: RoutePath): boolean {
	return matchPath([URL_LANG_PREFIX, ...path], location.pathname) !== null
}

export function makeLocationHrefForLang(lang: string): string {
	const url = location.pathname + location.search + location.hash
	const curPrefix = URL_LANG_PREFIX
	const newPrefix = makeUrlLangPrefix(lang)
	let newUrl = newPrefix + (url.startsWith(curPrefix) ? url.slice(curPrefix.length) : url)
	if (newUrl === '') newUrl = '/'
	return newUrl
}

export function A(
	props: JSX.HTMLAttributes<HTMLAnchorElement> & {
		ref?: Ref<typeof A>
		innerRef?: Ref<HTMLAnchorElement>
		isExternal?: boolean
	},
): JSX.Element {
	props = Object.assign({}, props)
	// @ts-ignore
	props.ref = props.innerRef
	delete props.innerRef
	if (props.href && !props.isExternal) props.href = URL_LANG_PREFIX + props.href
	if (props.isExternal) props.target = '_blank'
	// тайпскриптовый JSX-трансформер какой-то туповатый:
	// он для <a {...props}/> генерит лишний Object.assign({}, props)
	return h('a', props as Parameters<typeof h>[1])
}
