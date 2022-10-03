#!/usr/bin/env node
import { getBuildsFormattedBlocks } from '#lib/parsing/helperteam/build_texts.js'
import { runAndReadStdout } from '#lib/utils/os.js'
import { loadBuilds, parseYaml } from './_common.js'
import { getInlineText, isParagraphArr } from '#lib/parsing/helperteam/text.js'
import { getTrigrams, getSimularity } from '#lib/trigrams.js'

const lastTag = (await runAndReadStdout('git', ['describe', '--tags', '--abbrev=0'])).trim()
const prevBuilds = parseYaml(await runAndReadStdout('git', ['show', lastTag + ':data/generated/builds.yaml']))
const curBuilds = await loadBuilds()

const curTextBlocks = new Set(Array.from(getBuildsFormattedBlocks(curBuilds), ([block]) => block))

/** @type {(prefix:string, diff:unknown) => unknown} */
const logDiff = (prefix, diff) => console.log(prefix + ':', diff)

diffItems(prevBuilds, curBuilds, '', false)

/**
 * @param {any} prevItem
 * @param {any} curItem
 * @param {string} prefix
 * @param {boolean} hideDetails
 * @returns {boolean}
 */
function diffItems(prevItem, curItem, prefix, hideDetails) {
	const hideInnerDetails = hideDetails || shouldHideDetails(prefix)

	let hasChanges = false
	function onDiff(prefix, msg) {
		hasChanges = true
		if (!hideInnerDetails) logDiff(prefix, msg)
	}

	try {
		if (curTextBlocks.has(curItem)) {
			const curText = curItem === null ? '' : getText(curItem)
			let prevText = ''
			try {
				prevText = getText(prevItem)
			} catch (ex) {}
			if (prevText !== curText) {
				const prevTris = getTrigrams(prevText)
				const curTris = getTrigrams(curText)
				const simularity = getSimularity(prevTris, curTris)
				const maxTrisCount = Math.max(prevTris.size, curTris.size)
				const change = prevText === '' ? '+' : curText === '' ? '-' : ''
				const counts =
					change === '' ? ` ${((1 - simularity) * maxTrisCount).toFixed(0)}/${maxTrisCount}` : ''
				if (simularity < 0.95) onDiff(prefix, `[${change}text${counts}]`)
			}
			return hasChanges
		}
		if (Array.isArray(curItem)) {
			const curArr = curItem
			const prevArr = Array.isArray(prevItem) ? prevItem : []
			const itemsAreCoded = (curItem.length === 0 ? prevArr : curItem).every(
				x => typeof x === 'object' && x !== null && 'code' in x,
			)
			if (prevArr.length !== curArr.length) onDiff(prefix, `len ${prevArr.length} -> ${curArr.length}`)
			if (itemsAreCoded) {
				const prevMap = new Map(prevArr.map(x => [x.code, x]))
				const curMap = new Map(curArr.map(x => [x.code, x]))
				for (const code of prevMap.keys()) if (!curMap.has(code)) onDiff(prefix, `-#${code}`)
				for (const code of curMap.keys()) if (!prevMap.has(code)) onDiff(prefix, `+#${code}`)
				for (const code of curMap.keys())
					if (prevMap.has(code))
						diffItems(prevMap.get(code), curMap.get(code), prefix + ' #' + code, hideInnerDetails)
			} else {
				for (let i = 0; i < Math.min(curArr.length, prevArr.length); i++) {
					diffItems(prevArr[i], curArr[i], prefix + ' #' + i, hideInnerDetails)
				}
			}
			return hasChanges
		}
		if (typeof curItem === 'object' && curItem !== null) {
			const curObj = curItem
			const prevObj = typeof prevItem === 'object' && prevItem !== null ? prevItem : {}
			for (const attr in curItem) if (!(attr in prevObj)) onDiff(prefix, `+${attr}`)
			for (const attr in prevItem) if (!(attr in curObj)) onDiff(prefix, `-${attr}`)
			for (const attr in curItem)
				if (attr in prevObj)
					diffItems(prevObj[attr], curObj[attr], prefix + ' .' + attr, hideInnerDetails)
			return hasChanges
		}
		if (typeof curItem === 'string') {
			if (curItem !== prevItem) onDiff(prefix, `${prevItem} -> ${curItem}`)
			return hasChanges
		}
		if (typeof curItem === 'number') {
			if (curItem !== prevItem) onDiff(prefix, `${prevItem} -> ${curItem}`)
			return hasChanges
		}
		if (typeof curItem === 'boolean') {
			if (curItem !== prevItem) onDiff(prefix, `${prevItem} -> ${curItem}`)
			return hasChanges
		}
		onDiff(prefix, curItem)
		return hasChanges
	} finally {
		if (!hideDetails && hideInnerDetails && hasChanges) logDiff(prefix, '<changed>')
	}
}

/**
 * @param {import('#lib/parsing/helperteam/text').CompactTextParagraphs} node
 * @returns {string}
 */
function getText(node) {
	if (isParagraphArr(node)) return node.map(x => getText(x)).join('\n\n')
	if (typeof node !== 'string' && 'p' in node) return getInlineText(node.p)
	return getInlineText(node)
}

/**
 * @param {string} prefix
 */
function shouldHideDetails(prefix) {
	return /^ \.characters #[\w\-]+ \.roles #[\w\s\-]+ (\.artifacts \.sets|\.weapons \.advice)/.test(prefix)
}
