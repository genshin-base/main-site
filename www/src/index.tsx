if (process.env.NODE_ENV === 'development') {
	require('preact/debug')
}

// должно быть одним из первых
import '#src/errors/catch'

import { render } from 'preact'
import { renderToString } from 'preact-render-to-string'

import { App } from './App'

export const renderPage = BUNDLE_ENV.IS_SSR
	? html => {
			const content = renderToString(<App />, null, { pretty: false })
			return html
				.replace(/(?<=<div class="app">)/, () => content)
				.replace(/(?<=<title>)(.*)(?=<\/title>)/, (_, defTitle) => document.title || defTitle)
	  }
	: render(<App />, document.querySelector('body .app') as Element)
