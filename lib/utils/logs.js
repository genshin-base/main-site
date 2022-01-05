let needStdoutNewline = false
/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string} msg
 * @param {{newline?:boolean}} [opts]
 */
export function info(msg, opts) {
	if (needStdoutNewline) console.log()
	const newline = opts?.newline !== false
	process.stdout.write('\x1b[32mINFO\x1b[0m: ' + msg + (newline ? '\n' : ''))
	needStdoutNewline = !newline
}
/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string} msg
 */
export function warn(msg) {
	if (needStdoutNewline) console.log()
	console.warn('\x1b[33mWARN\x1b[0m: ' + msg)
	needStdoutNewline = false
}
export function progress() {
	process.stdout.write('.')
	needStdoutNewline = true
}
