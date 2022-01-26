import './App.scss'
import { PageWrap } from './components/page-wrap'
import { Footer } from './containers/footer'
import { Header } from './containers/header'
import { EquipmentPage } from './pages/equipment'
import { BuildsPage } from './pages/builds'
import { FrontPage } from './pages/front-page'

export function App() {
	let page = <FrontPage />
	// if (~location.pathname.indexOf('build')) page = <BuildsPage />
	// if (~location.pathname.indexOf('equipment')) page = <EquipmentPage />
	page = <BuildsPage />
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
