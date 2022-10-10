const ROLLBAR_TOKEN = 'f5661155727c4a9e9db4d770357a0bcf'

export function sendError(class_: string, message: string): Promise<void> {
	return sendNewItem('error', undefined, {
		trace: {
			frames: [],
			exception: {
				class: class_,
				message,
				// description: '',
			},
		},
	})
}

export function sendMessage(msg: string): Promise<void> {
	return sendNewItem('warning', 'msg:' + Date.now(), {
		message: {
			body: msg,
		},
	})
}

/**
 * {@link https://explorer.docs.rollbar.com/#operation/create-item}
 */
function sendNewItem(level, fingerprint, rollbarBody) {
	const body = JSON.stringify({
		data: {
			environment: process.env.NODE_ENV,
			body: rollbarBody,
			level,
			code_version: BUNDLE_ENV.VERSION.commitHash,
			platform: 'browser',
			context: location.href,
			client: {
				javascript: {
					browser: navigator.userAgent,
					// code_version: ''
					// source_map_enabled: false,
				},
			},
			fingerprint,
		},
	})
	const headers = {
		'X-Rollbar-Access-Token': ROLLBAR_TOKEN,
		'Content-Type': 'application/json',
	}
	return fetch('https://api.rollbar.com/api/1/item/', { method: 'POST', body, headers })
		.then(r => r.json())
		.then(resp => {
			if (resp.err !== 0) throw new Error(`rollbar: ` + resp.message)
		})
}
