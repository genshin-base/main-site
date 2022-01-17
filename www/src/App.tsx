import { PageWrap } from './components/page-wrap'
import { Footer } from './containers/footer'
import { Header } from './containers/header'
import { FrontPage } from './pages/front-page'

import './App.scss'
import { EquipmentPage } from './pages/equipnent'

export function App() {
	return (
		<div class="d-flex flex-column app-container">
			<Header />
			<main>
				<PageWrap>
					<FrontPage />
					{/* <EquipmentPage /> */}
				</PageWrap>
			</main>
			<Footer />
		</div>
	)
}
