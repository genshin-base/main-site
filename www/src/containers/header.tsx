import { useState } from 'preact/hooks'

import { A } from '#src/routes/router'
import { Nav } from '../components/nav'
import { MegaSearch } from './mega-search'

export function Header() {
	const [isNavExpanded, setIsNavExpanded] = useState(false)
	// TODO клик мимо компонента
	return (
		<header>
			<div className="navbar navbar-expand-lg navbar-dark header-main-bg">
				<div className="container">
					<A className="navbar-brand" href="/">
						Genshin Base
					</A>
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
			<div className="navbar py-2 header-sub-bg">
				<div className="container">
					<MegaSearch />
				</div>
			</div>
		</header>
	)
}
