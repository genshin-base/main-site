import { useCallback, useMemo, useState } from 'preact/hooks'

import { arrShallowEqual } from '#lib/utils/collections'
import { A } from '#src/routes/router'

export type Tab = { code: string; title?: string | JSX.Element; href?: string }

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
	onTabSelect?: (tab: T) => unknown
	classes?: string
}): JSX.Element {
	return (
		<ul className={`nav nav-tabs ${classes}`}>
			{tabs.map(t => (
				<li className="nav-item" key={t.code}>
					<A
						className={`nav-link c-pointer ${t.code === selectedTab.code ? 'active' : ''}`}
						href={t.href}
						onClick={e => {
							if (t.href) return
							e.preventDefault()
							onTabSelect && onTabSelect(t)
						}}
					>
						<span className={`${t.code === selectedTab.code ? 'opacity-75' : ''}`}>
							{titleFunc ? titleFunc(t) : 'title' in t ? t.title : t.code}
						</span>
					</A>
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
	visibleTabsLength,
}: {
	tabs: T[]
	titleFunc?: (tab: T) => string | JSX.Element
	selectedTab: T
	onTabSelect: (tab: T) => void
	classes?: string
	visibleTabsLength?: number
}): JSX.Element {
	const tabsGrouped: T[][] = []
	if (visibleTabsLength) {
		tabsGrouped[0] = tabs.slice(0, visibleTabsLength)
		tabsGrouped[1] = tabs.slice(visibleTabsLength, tabs.length - 1)
	} else {
		tabsGrouped[0] = tabs
	}
	// todo бордеррадиусы или другой дизайн
	return (
		<div>
			<div class={`btn-group ${classes}`}>
				{tabsGrouped[0].map(t => (
					<button
						type="button"
						disabled={tabs.length === 1}
						className={`btn lh-sm ${
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
			{visibleTabsLength && tabsGrouped[1].length ? (
				<div class={`btn-group ${classes}`}>
					{tabsGrouped[1].map(t => (
						<button
							type="button"
							disabled={tabs.length === 1}
							className={`btn lh-sm ${
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
			) : null}
		</div>
	)
}
export function LightBtnTabGroup<T extends Tab>({
	tabs,
	titleFunc,
	selectedTab,
	onTabSelect,
	classes = '',
}: {
	tabs: T[]
	titleFunc?: (tab: T) => string | JSX.Element
	selectedTab: T
	onTabSelect?: (tab: T) => void
	classes?: string
}): JSX.Element {
	const btnClass = 'flex-sm-fill small lh-sm text-sm-center nav-link c-pointer'
	const btnClassActive = btnClass + ' active'
	const btnClassDisabled = btnClass + ' disabled'
	return (
		<nav className={`nav nav-pills flex-column flex-sm-row ${classes}`}>
			{tabs.map(t => (
				<A
					className={
						tabs.length === 1
							? btnClassDisabled
							: t.code === selectedTab.code
							? btnClassActive
							: btnClass
					}
					key={t.code}
					href={t.href}
					onClick={e => {
						if (t.href) return
						e.preventDefault()
						onTabSelect && onTabSelect(t)
					}}
				>
					{titleFunc ? titleFunc(t) : 'title' in t ? t.title : t.code}
				</A>
			))}
		</nav>
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
