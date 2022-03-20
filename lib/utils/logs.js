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
/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string|Error} msg
 */
export function error(msg) {
	if (needStdoutNewline) console.log()
	let label = 'ERROR'
	if (msg instanceof Error) {
		const err = msg
		label = err.constructor.name
		msg = err.stack ?? err.message
		if (msg.startsWith(label + ':')) msg = msg.slice(label.length + 1).trimLeft()
	}
	console.warn(`\x1b[31m${label}\x1b[0m: ` + msg)
	needStdoutNewline = false
}
/**
 * {@link https://gist.github.com/fnky/458719343aabd01cfb17a3a4f7296797}
 * @param {string|Error} msg
 */
export function fatal(msg) {
	error(msg)
	process.exit(1)
}
export function progress() {
	process.stdout.write('.')
	needStdoutNewline = true
}

/**
 * @template TRet
 * @template TDef
 * @template {(msg:string)=>unknown} TPrefixFunc этот шаблон тут нафиг не нужен, но без него глючит кривой тайпчекер
 * @param {string} prefix
 * @param {string} suffix
 * @param {TDef} defaultVal
 * @param {(setPrefix:TPrefixFunc) => TRet} func
 * @returns {TRet|TDef}
 */
export function tryWithContext(prefix, suffix, defaultVal, func) {
	function setPrefix(msg) {
		prefix = msg
	}
	try {
		return func(/**@type {TPrefixFunc}*/ (setPrefix))
	} catch (ex) {
		if (ex && ex.constructor !== Error) throw ex
		warn(prefix + ': ' + ex.message + (suffix ? ', ' + suffix : ''))
		return defaultVal
	}
}
