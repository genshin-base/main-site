import { GoUpBtn } from './components/go-up-btn'
import { PageWrap } from './components/page-wrap'
import { BottomTabBar } from './containers/bottom-tab-bar'
import { Footer } from './containers/footer'
import { Header } from './containers/header'
import { AboutPage } from './pages/about'
import { BuildsPage_BuildDetail, BuildsPage_CharSelect } from './pages/builds'
import { ArtifactsPage, WeaponsPage } from './pages/equipment'
import { EverywherePage } from './pages/everywhere'
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
	route(paths.about, AboutPage),
	route(paths.everywhere, EverywherePage),
]

export function App(): JSX.Element {
	const page = useRouter(routes)
	return (
		<div class="d-flex flex-column app-container">
			<Header />
			<main>
				<PageWrap>{page}</PageWrap>
			</main>
			{!BUNDLE_ENV.IS_TG_MINI_APP && <Footer />}
			{!BUNDLE_ENV.IS_TG_MINI_APP && <GoUpBtn />}
			{BUNDLE_ENV.IS_TG_MINI_APP && <BottomTabBar />}
		</div>
	)
}
