export type Tab = { title: string | JSX.Element; code: string }

export function Tabs({
	tabs,
	selectedTab,
	onTabSelect,
	classes = '',
}: {
	tabs: Tab[]
	selectedTab: Tab
	onTabSelect: (tab: Tab) => unknown
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
						{t.title}
					</a>
				</li>
			))}
		</ul>
	)
}

export function BtnTabGroup({
	tabs,
	selectedTab,
	onTabSelect,
	classes = '',
}: {
	tabs: Tab[]
	selectedTab: Tab
	onTabSelect: (Tab) => void
	classes?: string
}): JSX.Element {
	return (
		<div class={`btn-group ${classes}`}>
			{tabs.map(t => (
				<button
					type="button"
					className={`btn btn-sm ${
						t.code === selectedTab.code ? 'btn-primary' : 'btn-outline-primary'
					} `}
					key={t.code}
					onClick={e => {
						onTabSelect(t)
					}}
				>
					{t.title}
				</button>
			))}
		</div>
	)
}
