import { useState } from 'preact/hooks'
export function Nav() {
	const [isExpanded, setIsExpanded] = useState(false)
	// TODO клик мимо компонента
	return (
		<div className="collapse navbar-collapse">
			<ul className="navbar-nav me-auto mb-2 mb-lg-0">
				<li className="nav-item">
					<a className="nav-link active" href="#">
						Build
					</a>
				</li>
				<li className="nav-item">
					<a className="nav-link active" href="#">
						About
					</a>
				</li>
			</ul>
			<ul className="navbar-nav mb-2 mb-lg-0 float-end">
				<li className="nav-item dropdown">
					<a
						className={`nav-link dropdown-toggle ${isExpanded ? 'show' : ''}`}
						id="navbarDropdown"
						role="button"
						onClick={() => setIsExpanded(!isExpanded)}
					>
						English
					</a>
					<ul className={`dropdown-menu ${isExpanded ? 'show' : ''}`}>
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
