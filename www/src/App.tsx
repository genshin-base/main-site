import { PageWrap } from './components/page-wrap'
import { Footer } from './containers/footer'
import { Header } from './containers/header'
import { BuildsPage_BuildDetail, BuildsPage_CharSelect } from './pages/builds'
import { EquipmentPage } from './pages/equipment'
import { FrontPage } from './pages/front-page'
import { paths } from './routes/paths'
import { route, useRouter } from './routes/router'

import './App.scss'
import './animations.scss'
import { AboutPage } from './pages/about'

const routes = [
	route(paths.front, FrontPage),
	route(paths.builds, BuildsPage_CharSelect),
	route(paths.buildCharacters, BuildsPage_BuildDetail),
	route(paths.equipment, EquipmentPage),
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
		</div>
	)
}
