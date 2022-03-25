if (process.env.NODE_ENV === 'development') {
	require('preact/debug')
}

// должно быть одним из первых
import '#src/errors/catch'

import { render } from 'preact'
import { renderToString } from 'preact-render-to-string'

import { App } from './App'

export const renderPage = BUNDLE_ENV.IS_SSR
	? html =>
			html.replace(
				/(<div class="app">)/,
				(_, div) => div + renderToString(<App />, null, { pretty: false }),
			)
	: render(<App />, document.querySelector('body .app') as Element)
