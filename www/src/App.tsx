import { GoUpBtn } from './components/go-up-btn'
import { PageWrap } from './components/page-wrap'
import { Footer } from './containers/footer'
import { Header } from './containers/header'
import { AboutPage } from './pages/about'
import { AbyssPage } from './pages/abyss'
import { BuildsPage_BuildDetail, BuildsPage_CharSelect } from './pages/builds'
import { ArtifactsPage, WeaponsPage } from './pages/equipment'
import { FrontPage } from './pages/front-page'
import { paths } from './routes/paths'
import { route, useRouter } from './routes/router'

import './App.scss'
import './animations.scss'

const routes = [
	route(paths.front, FrontPage),
	route(paths.builds, BuildsPage_CharSelect),
	route(paths.buildCharacters, BuildsPage_BuildDetail),
	route(paths.weapons, WeaponsPage),
	route(paths.artifacts, ArtifactsPage),
	route(paths.abyss, AbyssPage),
	route(paths.about, AboutPage),
]

export function App(): JSX.Element {
	const page = useRouter(routes)
	return (
		<div class="d-flex flex-column app-container">
			<Header />
			<main>
				<PageWrap>{page}</PageWrap>
			</main>
			<Footer />
			<GoUpBtn />
		</div>
	)
}
