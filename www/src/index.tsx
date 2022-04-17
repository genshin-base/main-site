if (process.env.NODE_ENV === 'development') {
	require('preact/debug')
}

// должно быть одним из первых
import '#src/errors/catch'

import { render } from 'preact'
import { renderToString } from 'preact-render-to-string'

import { App } from './App'
import { I18N_UNSUPPORTED_LOCATION_WARNING } from './i18n/i18n'

export const renderContent = BUNDLE_ENV.IS_SSR
	? () => renderToString(<App />, null, { pretty: false })
	: isOnExpectedDomain()
	? render(<App />, document.querySelector('body .app') as Element)
	: insertUnsupportedLocationWarning()

function isOnExpectedDomain() {
	if (BUNDLE_ENV.EXPECTED_HOSTNAME === null) return true
	return location.hostname === BUNDLE_ENV.EXPECTED_HOSTNAME
}

function insertUnsupportedLocationWarning() {
	const wrap = document.createElement('div')
	wrap.className = 'py-1 bg-danger text-white text-center'
	wrap.textContent = I18N_UNSUPPORTED_LOCATION_WARNING
	document.body.prepend(wrap)
}
