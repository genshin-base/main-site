import './rollbar'

import { logErrorExt } from './'

if (!BUNDLE_ENV.IS_SSR) {
	window.addEventListener('error', e => {
		// похоже на ошибку во внешнем плагине, игнорируем её
		if (e.message === 'Script error.' && e.filename === '') return
		// e.message обычно начинается с "Uncaught Error:", можно не добавлять свой префикс
		const msg = `${e.message} in ${e.filename}:${e.lineno}:${e.colno}`
		logErrorExt(msg, e.error, true)
	})

	window.addEventListener('unhandledrejection', e => {
		// при Promise.reject(123) у ошибки не будет ни сообщения, ни стека; такой "reason" отправляем просто текстом
		const msg = 'Unhandled Rejection: ' + (e.reason?.message ? e.reason.message : e.reason + '')
		logErrorExt(msg, e.reason, true)
	})
}
