import './App.scss'
import { PageWrap } from './components/page-wrap'
import { Footer } from './containers/footer'
import { Header } from './containers/header'
import { FrontPage } from './pages/front-page'

export function App() {
	return (
		<div class="d-flex flex-column app-container">
			<Header />
			<main>
				<PageWrap>
					<FrontPage />
				</PageWrap>
			</main>
			<Footer />
		</div>
	)
}
