if (process.env.NODE_ENV === 'development') {
	require('preact/debug')
}
if (BUNDLE_ENV.TG_WEB_APP) require('./miniapp-theme.scss')

// должно быть одним из первых
import '#src/errors/catch'

import { render } from 'preact'

import { WebApp } from '#lib/telegram/webapp'
import { App } from './App'
import { I18N_UNSUPPORTED_LOCATION_WARNING } from './i18n/i18n'

export type SSRRenderFunc = () => Promise<string>

export const renderContent: void | SSRRenderFunc = BUNDLE_ENV.IS_SSR
	? // Импортировать preact-render-to-string в начале нельзя,
	  // т.к. Терсер видит где-то там побочные эффекты и не выкидывает код из продакшн-бандла.
	  // А от require(...) что-то падает в недрах преактовых хуков.
	  () => import('preact-render-to-string').then(x => x.renderToString(<App />, null))
	: isOnExpectedDomain()
	? render(<App />, document.querySelector('body .app') as Element)
	: insertUnsupportedLocationWarning()

function isOnExpectedDomain() {
	if (BUNDLE_ENV.SUPPORTED_DOMAINS === null) return true
	return BUNDLE_ENV.SUPPORTED_DOMAINS.some(x => location.hostname.endsWith(x))
}

function insertUnsupportedLocationWarning() {
	const wrap = document.createElement('div')
	wrap.className = 'py-1 bg-danger text-white text-center'
	wrap.textContent = I18N_UNSUPPORTED_LOCATION_WARNING
	document.body.prepend(wrap)
}

if (BUNDLE_ENV.TG_WEB_APP) {
	console.log(`tg mini app v${WebApp.version}, lang: ${WebApp.initDataUnsafe.user?.language_code}`)
}
