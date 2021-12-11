import { Nav } from '../components/nav'

export function Header() {
	return (
		<header>
			<div className="navbar navbar-expand-lg navbar-light navbar-dark">
				<div className="container">
					<a class="navbar-brand" href="#">
						Genshin Base
					</a>
					<Nav />
				</div>
			</div>
		</header>
	)
}
