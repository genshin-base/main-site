import { useState } from 'preact/hooks'

import { Nav } from '../components/nav'

export function Header() {
	const [isNavExpanded, setIsNavExpanded] = useState(false)
	// TODO клик мимо компонента
	return (
		<header>
			<div className="navbar navbar-expand-md navbar-dark bg-primary">
				<div className="container">
					<a className="navbar-brand" href="/">
						Genshin Base
					</a>
					<button
						className="navbar-toggler"
						type="button"
						onClick={() => setIsNavExpanded(!isNavExpanded)}
					>
						<span className="navbar-toggler-icon"></span>
					</button>
					<Nav isNavExpanded={isNavExpanded} />
				</div>
			</div>
		</header>
	)
}
