import { PageWrap } from './components/page-wrap'
import { Footer } from './containers/footer'
import { Header } from './containers/header'
import { BuildsPage } from './pages/builds'
import { EquipmentPage } from './pages/equipment'
import { FrontPage } from './pages/front-page'

import './App.scss'

export function App(): JSX.Element {
	let page = <FrontPage />
	if (~location.pathname.indexOf('build')) page = <BuildsPage />
	if (~location.pathname.indexOf('equipment')) page = <EquipmentPage />
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
