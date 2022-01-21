export type TabOpt = { code: string; title?: string | JSX.Element }

export function tabTitleFromName(obj: { name: string }): string {
	return obj.name
}

export function Tabs<T extends TabOpt>({
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
						{titleFunc ? titleFunc(t) : 'title' in t ? t.title : t}
					</a>
				</li>
			))}
		</ul>
	)
}

export function BtnTabGroup<T extends TabOpt>({
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
					className={`btn btn-sm lh-sm ${
						t.code === selectedTab.code ? 'btn-primary' : 'btn-outline-primary'
					} `}
					key={t.code}
					onClick={e => {
						onTabSelect(t)
					}}
				>
					{titleFunc ? titleFunc(t) : 'title' in t ? t.title : t}
				</button>
			))}
		</div>
	)
}
