#!/usr/bin/env node
import { BASE_DIR, CACHE_DIR } from '../_common.js'
import { getFile } from '#lib/requests.js'
import { info } from '#lib/utils/logs.js'
import {
	forEachTBodyRow,
	getTextContent,
	isNode,
	mustFindNodeWithTag,
	parseXmlStream,
	searchNodeWithTag,
} from '#lib/xml.js'
import path from 'path'
import { createReadStream, promises as fs } from 'fs'
import { relativeToCwd } from '#lib/utils/os.js'

const PAGE_URL = 'https://core.telegram.org/bots/webapps'

const outFPath = BASE_DIR + '/lib/telegram/webapp_types.d.ts'
await fs.writeFile(outFPath, await extractMiniAppTypes(CACHE_DIR))
info('saved to: ' + relativeToCwd(outFPath))

/**
 * @typedef {{
 *   name: string,
 *   doc: string,
 *   fields: {name:string, type:string, args:string[]|null, doc:string}[],
 * }} StructTypeDef
 */

/**
 * @typedef {{
 *   doc: string,
 *   types: {name:string, arg:string, doc:string}[],
 * }} EventsTypeDef
 */

/**
 * @param {string} cacheDir
 */
async function extractMiniAppTypes(cacheDir) {
	const root = await getTgPage(cacheDir)

	let version = null
	{
		const found = searchNodeWithTag(root, 'h3', (node, ancestors) => {
			return getTextContent(node).trim() === 'Recent changes'
		})
		if (!found) throw new Error('can not find changes block')

		const parent = found.ancestors[found.ancestors.length - 1]
		for (const node of parent.children.slice(parent.children.indexOf(found.node))) {
			if (isNode(node) && node.tag === 'p') {
				const text = getTextContent(node).trim()
				const m = text.match(/^Bot API (\d+\.\d+(?:\.\d)?)$/)
				if (!m) throw new Error('unexpected version text: ' + text)
				version = m[1]
				break
			}
		}
	}
	if (!version) throw new Error('can not find last version in changes')
	info('Bot API version: ' + version)

	const types = []
	{
		const found = searchNodeWithTag(root, 'h3', (node, ancestors) => {
			return getTextContent(node).trim() === 'Initializing Mini Apps'
		})
		if (!found) throw new Error(`can not find mini app initialization block`)

		const parent = found.ancestors[found.ancestors.length - 1]
		types.push(extractStructDoc(parent, found.node, 'WebApp'))

		for (const node of parent.children.slice(parent.children.indexOf(found.node) + 1)) {
			if (!isNode(node)) continue
			if (node.tag === 'h3') break

			const title = getTextContent(node).trim()
			if (/^\w+$/.test(title)) {
				types.push(extractStructDoc(parent, node, title))
			}
		}
	}

	let events = /**@type {EventsTypeDef|null}*/ (null)
	{
		const found = searchNodeWithTag(root, 'h4', (node, ancestors) => {
			return getTextContent(node).trim() === 'Events Available for Mini Apps'
		})
		if (!found) throw new Error(`can not find event types block`)

		const eventTypes = /**@type {EventsTypeDef['types']}*/ ([])
		const parent = found.ancestors[found.ancestors.length - 1]
		const { doc, table } = mustFindDocTableAfter(parent, found.node)
		const tbody = mustFindNodeWithTag(table, 'tbody')
		forEachTBodyRow(tbody, (row, cells, rowIndex) => {
			const name = getTextContent(cells[0])
				.trim()
				.replace(/\s+NEW$/, '')
			const doc = getDocTextContent(cells[1])
			eventTypes.push({ name, arg: 'void', doc })
		})
		events = { doc, types: eventTypes }
	}
	if (!events) throw new Error('can not find events')

	patch(types, events)

	let out = ''
	out += `/** generated by ${path.relative(BASE_DIR, process.argv[1])} */\n\n`

	out += `declare global {\n`
	out += `  interface Window { Telegram: { WebApp: WebApp } }\n`
	out += `}\n\n`

	// out += `export const TG_LATEST_BOT_API_VERSION = ${version}\n\n`

	out += `export interface EventMap {\n`
	for (const type of events.types) {
		out += `  /**\n`
		out += type.doc
			.split('\n')
			.map(x => ('   * ' + x).trimEnd() + '\n')
			.join('')
		out += `   */\n`
		out += `  ${type.name}: ${type.arg}\n`
	}
	out += '}\n'

	for (const type of types) {
		out += stringifyStructDoc(type)
	}
	return out
}

/**
 *
 * @param {StructTypeDef[]} types
 * @param {EventsTypeDef} events
 */
function patch(types, events) {
	updateArgs((st, fi, arg) => {
		if (['version', 'color', 'url', 'query', 'message', 'text'].includes(arg)) return 'string'
	})
	updateArgs((st, fi, arg) => {
		if (st === 'WebApp') {
			if (fi === 'sendData' && arg === 'data') return 'string'
			if (fi === 'switchInlineQuery' && arg === 'choose_chat_types?')
				return `'users' | 'bots' | 'groups' | 'channels'`
			if (fi === 'openLink' && arg === 'options?') return '{ try_instant_view: boolean }'
			if (fi === 'openInvoice' && arg === 'callback?')
				return `(status: EventMap['invoiceClosed']['status']) => unknown`
			if (fi === 'showPopup') {
				if (arg === 'params') return 'PopupParams'
				if (arg === 'callback?') return '(button_id: string) => unknown'
			}
			if (fi === 'showAlert' && arg === 'callback?') return '() => unknown'
			if (fi === 'showConfirm' && arg === 'callback?') return '(isOk: boolean) => unknown'
			if (fi === 'showScanQrPopup') {
				if (arg === 'params') return 'ScanQrPopupParams'
				if (arg === 'callback?') return '(text: string) => true|void'
			}
			if (fi === 'readTextFromClipboard' && arg === 'callback?') return '(text: string) => unknown'
			if (fi === 'requestWriteAccess' && arg === 'callback?')
				return '(accessGranted: boolean) => unknown'
			if (fi === 'requestContact' && arg === 'callback?') return '(wasProvided: boolean) => unknown'
		}
		if (st === 'BackButton' || st === 'MainButton') {
			if (fi === 'onClick' && arg === 'callback') return '() => unknown'
			if (fi === 'offClick' && arg === 'callback') return '() => unknown'
		}
		if (st === 'MainButton') {
			if (arg === 'leaveActive') return 'boolean'
			if (fi === 'setParams' && arg === 'params')
				return '{ text: string, color: string, text_color: string, is_active: boolean, is_visible: boolean }'
		}
		if (st === 'HapticFeedback') {
			if (fi === 'impactOccurred' && arg === 'style')
				return `'light' | 'medium' | 'heavy' | 'rigid' | 'soft'`
			if (fi === 'notificationOccurred' && arg === 'type') return `'error' | 'success' | 'warning'`
		}
		if (st === 'CloudStorage') {
			if (arg === 'key' || arg === 'value') return 'string'
			if (arg === 'keys') return 'string[]'
			if (fi === 'setItem' && arg === 'callback?')
				return '(err: Error | null, wasStored: boolean) => unknown'
			if (fi === 'getItem' && arg === 'callback') return '(err: Error | null, value: string) => unknown'
			if (fi === 'getItems' && arg === 'callback')
				return '(err: Error | null, values: Record<string, string>) => unknown'
			if (fi === 'removeItem' && arg === 'callback?')
				return '(err: Error | null, wasRemoved: boolean) => unknown'
			if (fi === 'removeItems' && arg === 'callback?')
				return '(err: Error | null, wereRemoved: boolean) => unknown'
			if (fi === 'getKeys' && arg === 'callback')
				return '(err: Error | null, keys: string[]) => unknown'
		}
	})

	for (const type of types) {
		for (const field of type.fields) {
			if (type.name === 'WebApp' && field.name === 'colorScheme') {
				field.type = `'light' | 'dark'`
			}
			if (type.name === 'PopupButton' && field.name === 'type') {
				field.type = `'default' | 'ok' | 'close' | 'cancel' | 'destructive'`
			}
			if (type.name === 'WebAppChat' && field.name === 'type') {
				field.type = `'group' | 'supergroup' | 'channel'`
			}
		}
	}

	for (const type of types) {
		for (const field of type.fields) {
			const args = field.args
			if (args && args.some(x => x === 'eventType')) {
				field.name += '<K extends keyof EventMap>'
				for (let i = 0; i < args.length; i++) {
					if (args[i] === 'eventType') args[i] += ':K'
					if (args[i].startsWith('eventHandler'))
						args[i] += ':(this:WebApp, arg:EventMap[K]) => unknown'
				}
			}
		}
	}

	for (const type of events.types) {
		if (type.name === 'viewportChanged') type.arg = '{ isStateStable: boolean }'
		if (type.name === 'invoiceClosed')
			type.arg = `{ url: string, status: 'paid' | 'cancelled' | 'failed' | 'pending' }`
		if (type.name === 'popupClosed') type.arg = `{ button_id: string | null }`
		if (type.name === 'qrTextReceived') type.arg = `{ data: string }`
		if (type.name === 'clipboardTextReceived') type.arg = `{ data: string | null }`
		if (type.name === 'writeAccessRequested') type.arg = `{ status: 'allowed' | 'cancelled' }`
		if (type.name === 'contactRequested') type.arg = `{ status: 'sent' | 'cancelled' }`
	}

	/** @param {(typeName:string, fieldName:string, argName:string) => string|void|undefined|null|false} func */
	function updateArgs(func) {
		for (const type of types) {
			for (const field of type.fields) {
				if (field.args)
					for (let i = 0; i < field.args.length; i++) {
						const res = func(type.name, field.name, field.args[i])
						if (res) field.args[i] += ': ' + res
					}
			}
		}
	}
}

/**
 * @param {import('#lib/xml.js').Node} parentNode
 * @param {import('#lib/xml.js').Node} afterHeader
 * @param {string} name
 */
function extractStructDoc(parentNode, afterHeader, name) {
	const { doc, table } = mustFindDocTableAfter(parentNode, afterHeader)

	const fields = /**@type {StructTypeDef['fields']}*/ ([])
	const tbody = mustFindNodeWithTag(table, 'tbody')
	forEachTBodyRow(tbody, (row, cells, rowIndex) => {
		let name = getTextContent(cells[0])
			.trim()
			.replace(/\s+NEW$/, '')
			// '[, smth]' -> ', smth?'
			.replace(/\[(.*)\]/, (_, opts) =>
				opts
					.split(',')
					.map(x => (x ? x + '?' : x))
					.join(','),
			)
		const argsM = name.match(/^([^)]*)\((.*)\)$/)
		let args = null
		if (argsM) {
			name = argsM[1]
			args = argsM[2].split(',').map(x => x.trim())
		}
		const type = getTextContent(cells[1]).trim()
		const doc = getDocTextContent(cells[2])

		fields.push({ name, args, type, doc })
	})

	for (const field of fields) {
		if (field.type.startsWith('Array of')) {
			field.type = field.type.replace(/Array of\s+/, '') + '[]'
		}

		if (field.type === 'Function') {
			if (field.name.match(/^is[A-Z]/)) {
				field.type = 'boolean'
			} else {
				field.type = 'void'
			}
		} else if (field.type === 'String') {
			field.type = 'string'
		} else if (field.type === 'Boolean') {
			field.type = 'boolean'
		} else if (field.type === 'True') {
			field.type = 'true'
		} else if (field.type === 'Float') {
			field.type = 'number'
			field.doc += '\n\n(Float)'
		} else if (field.type === 'Integer') {
			field.type = 'number'
			field.doc += '\n\n(Integer)'
		}

		if (/^\*?Optional/.test(field.doc)) {
			field.name += '?'
		}
	}

	return { name, doc, fields }
}

/**
 * @param {StructTypeDef} typeWebApp
 */
function stringifyStructDoc(typeWebApp) {
	let out = ''
	out += `/**\n`
	out += typeWebApp.doc
		.split('\n')
		.map(x => ' * ' + x + '\n')
		.join('')
	out += ` */\n`
	out += `export interface ${typeWebApp.name} {\n`
	for (const field of typeWebApp.fields) {
		out += `  /**\n`
		out += field.doc
			.split('\n')
			.map(x => '   * ' + x + '\n')
			.join('')
		out += `   */\n`
		out += `  ${field.name}${field.args ? `(${field.args.join(', ')})` : ''}: ${field.type}\n`
	}
	out += '}\n\n'
	return out
}

/**
 * @param {import('#lib/xml.js').Node} parentNode
 * @param {import('#lib/xml.js').Node} afterHeader
 */
function mustFindDocTableAfter(parentNode, afterHeader) {
	const structDoc = []
	let table = null
	for (const node of parentNode.children.slice(parentNode.children.indexOf(afterHeader))) {
		if (!isNode(node)) continue
		if (node.tag === 'p') {
			structDoc.push(getDocTextContent(node))
		} else if (node.tag === 'pre') {
			structDoc.push('```\n' + getTextContent(node).trim() + '\n```')
		} else if (node.tag === 'table') {
			table = node
			break
		}
	}
	if (!table) throw new Error(`can not find table after "${getTextContent(afterHeader)}"`)
	return { doc: structDoc.join('\n\n'), table }
}

/**
 * @param {import('#lib/xml.js').NodeOrText} node
 * @returns {string}
 */
function getDocTextContent(node) {
	return getTextInner(node)
		.replace(/ +/g, ' ')
		.replace(/(^|\n) /g, '$1')
		.replace(/ ([.,\n])/g, '$1')
		.trim()
		.replace(/\n+/g, '\n')
		.replace(/\n/g, '\n\n')

	/**
	 * @param {import('#lib/xml.js').NodeOrText} node
	 * @returns {string}
	 */
	function getTextInner(node) {
		if (typeof node === 'string') return escapeMD(node.replaceAll('\n', ' '))
		if (node.tag === 'br') return '\n'
		let text = node.children.map(getTextInner).join(' ')
		if (node.tag === 'mark' && text.trim() === 'NEW') return ''
		if (node.tag === 'em') text = `*${text}*`
		if (node.tag === 'mark') text = `**${text}**`
		if (node.tag === 'strong') text = `**${text}**`
		if (node.tag === 'code') text = `\`${text}\``
		if (node.tag === 'a' && node.attrs.href) {
			let href = node.attrs.href
			if (href.startsWith('#')) href = PAGE_URL + href
			text = `[${text}](${href})`
		}
		return text
	}
}
/** @param {string} text */
function escapeMD(text) {
	return text.replace(/([_*\[\]~`|])/g, '\\$1')
}

/**
 * @param {string} cacheDir
 * @returns {Promise<import('#lib/xml').Node>}
 */
async function getTgPage(cacheDir) {
	await fs.mkdir(`${cacheDir}/telegram.org`, { recursive: true })

	const fpath = `${cacheDir}/telegram.org/${PAGE_URL.replace(/[:\/]/g, '-')}.html`
	await getFile(PAGE_URL, {}, fpath, false)

	return await parseXmlStream(createReadStream(fpath, { encoding: 'utf-8' }))
}
