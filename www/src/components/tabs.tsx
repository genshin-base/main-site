import { useCallback, useMemo, useState } from 'preact/hooks'

import { arrShallowEqual } from '#lib/utils/collections'

export type Tab = { code: string; title?: string | JSX.Element }

export function tabTitleFromName(obj: { name: string }): string {
	return obj.name
}

export function Tabs<T extends Tab>({
	tabs,
	titleFunc,
	selectedTab,
	onTabSelect,
	classes = '',
}: {
	tabs: T[]
	titleFunc?: (tab: T) => string | JSX.Element
	selectedTab: T
	onTabSelect: (tab: T) => unknown
	classes?: string
}): JSX.Element {
	return (
		<ul className={`nav nav-tabs ${classes}`}>
			{tabs.map(t => (
				<li className="nav-item" key={t.code}>
					<a
						className={`nav-link ${t.code === selectedTab.code ? 'active' : ''}`}
						href="#"
						onClick={e => {
							e.preventDefault()
							onTabSelect(t)
						}}
					>
						{titleFunc ? titleFunc(t) : 'title' in t ? t.title : t.code}
					</a>
				</li>
			))}
		</ul>
	)
}

export function BtnTabGroup<T extends Tab>({
	tabs,
	titleFunc,
	selectedTab,
	onTabSelect,
	classes = '',
}: {
	tabs: T[]
	titleFunc?: (tab: T) => string | JSX.Element
	selectedTab: T
	onTabSelect: (tab: T) => void
	classes?: string
}): JSX.Element {
	return (
		<div class={`btn-group ${classes}`}>
			{tabs.map(t => (
				<button
					type="button"
					disabled={tabs.length === 1}
					className={`btn btn-sm lh-sm ${
						t.code === selectedTab.code ? 'btn-primary' : 'btn-outline-primary'
					} `}
					key={t.code}
					onClick={e => {
						onTabSelect(t)
					}}
				>
					{titleFunc ? titleFunc(t) : 'title' in t ? t.title : t.code}
				</button>
			))}
		</div>
	)
}

/**
 * а) сохраняет выделенную вкладку по коду (после смены вкладок, если выбранного ранее кода
 *    среди новых вкладок нет, возвращает первую вкладку).
 * б) если передан массив args, сохраняет выбранную вкладку для каждого уникального набора args
 *    (полезно, если эти вкладки находятся врутри другого переключателя,
 *    например вкладки ролей, а над ними - переключатель персонажей).
 */
export function useSelectable<T extends Tab>(tabs: T[], args?: unknown[]): [T, (tab: T) => unknown] {
	const [tabCodes, setTabCodes] = useState<{ code: string; args: unknown[] }[]>([])

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const argsInner = useMemo(() => args ?? [], args)

	const item = useMemo(() => tabCodes.find(x => arrShallowEqual(argsInner, x.args)), [argsInner, tabCodes])

	const tab = useMemo(() => (item && tabs.find(x => x.code === item.code)) ?? tabs[0], [tabs, item])

	const setTab = useCallback(
		(tab: T) => {
			if (item) {
				if (item.code !== tab.code) {
					setTabCodes(tabCodes.filter(x => x !== item).concat({ ...item, code: tab.code }))
				}
			} else {
				setTabCodes(tabCodes.concat({ code: tab.code, args: argsInner }))
			}
		},
		[argsInner, item, tabCodes],
	)
	return [tab, setTab]
}
