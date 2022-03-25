import { sendError } from './rollbar'

export function logErrorExt(message: string | null, anyError: unknown, silent: boolean): void {
	const error = anyError ? (anyError instanceof Error ? anyError : new Error(anyError + '')) : null

	if (!silent) console.error(message, error)

	const class_ = error ? error.constructor.name : 'Message'
	const text = (message ? message + '\n' : '') + (error ? error.stack : '')
	sendError(class_, text).catch(console.error)
}

export function logError(error: unknown): void {
	logErrorExt(null, error, false)
}
