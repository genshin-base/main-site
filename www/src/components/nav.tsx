import { useState } from 'preact/hooks'
type Props = { isNavExpanded: boolean }

export function Nav({ isNavExpanded }: Props): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false)
	// TODO клик мимо компонента
	return (
		<div className={`collapse navbar-collapse ${isNavExpanded ? 'show' : ''}`}>
			<ul className="navbar-nav me-auto mb-2 mb-md-0">
				<li className="nav-item">
					<a className="nav-link active" href="#">
						Builds
					</a>
				</li>
				<li className="nav-item">
					<a className="nav-link active" href="#">
						About
					</a>
				</li>
			</ul>
			<ul className="navbar-nav mb-2 mb-md-0 float-md-end">
				<li className="nav-item dropdown">
					<a
						className={`nav-link dropdown-toggle ${isExpanded ? 'show' : ''}`}
						id="navbarDropdown"
						role="button"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						English
					</a>
					{/* todo почему-то не добавляется класс dropdown-menu-end */}
					<ul className={`dropdown-menu ${isExpanded ? 'show' : ''}`} style={'right: 0'}>
						<li>
							<a className="dropdown-item" href="#">
								English
							</a>
						</li>
						<li>
							<a className="dropdown-item" href="#">
								Русский
							</a>
						</li>
					</ul>
				</li>
			</ul>
		</div>
	)
}
