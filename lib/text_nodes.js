/** @typedef {{kind:'p',    children:TextItem[], class:string|null}} TextP */
/** @typedef {{kind:'span', children:TextItem[], class:string|null}} TextSpan */
/** @typedef {{kind:'a',    children:TextItem[], class:string|null, href:string|null}} TextA */
/** @typedef {TextP|TextA|TextSpan|string} TextItem */
/** @typedef {TextP|TextA|TextSpan} TextStyledItem */
/** @typedef {TextP|TextA|TextSpan} TextTypedItem */

/** @param {TextItem} item */
function isBlock(item) {
	return typeof item !== 'string' && item.kind === 'p'
}

// /**
//  * @param {TextItem} item
//  * @param {'p'|'span'|'a'|null} parentKind
//  */
// function canUnnest(item, parentKind) {
// 	return
// }

/**
 * @param {TextItem} item
 * @returns {item is string}
 */
function isStr(item) {
	return typeof item === 'string'
}

/**
 * @param {TextItem} a
 * @param {TextItem} b
 */
function canMerge(a, b) {
	const aIsStr = isStr(a)
	const bIsStr = isStr(b)
	if (aIsStr && bIsStr) return true
	if (!aIsStr && !bIsStr) {
		if (a.kind === b.kind && !isBlock(a) && a.class === b.class) {
			if (a.kind !== 'a' || b.kind !== 'a' || a.href === b.href) return true
		}
	}
	return false
}

/**
 * @param {TextItem[]} roots
 */
export function optimizeTextItems(roots) {
	while (optimizeTextItemsInner(roots, null)) {}
}

/**
 * @param {TextItem[]} roots
 * @param {TextTypedItem|null} parentItem
 */
function optimizeTextItemsInner(roots, parentItem) {
	let hasChanged = false

	// unwrapping
	for (let i = 0; i < roots.length; i++) {
		const item = roots[i]
		if (typeof item === 'string') continue

		// empty a/span
		if ((item.kind === 'span' || item.kind === 'a') && item.children.length === 0) {
			roots.splice(i--, 1)
			hasChanged = true
			continue
		}

		const res = optimizeTextItemsInner(item.children, item)
		hasChanged ||= res

		// unnestable children
		const canUnnest =
			(item.class === null || parentItem?.class === item.class) &&
			(item.kind === parentItem?.kind || (parentItem?.kind === 'a' && item.kind === 'span'))
		if (canUnnest) {
			roots.splice(i, 1, ...item.children)
			i += item.children.length - 1
			hasChanged = true
		}

		// only strings in span
		if (item.kind === 'span' && item.class === null && item.children.every(isStr)) {
			roots.splice(i, 1, ...item.children)
			i += item.children.length - 1
			hasChanged = true
		}

		// merhable single child span
		if (item.children.length === 1) {
			const child = item.children[0]
			if (
				!isStr(child) &&
				child.kind === 'span' &&
				(item.class === null || child.class === null || item.class === child.class)
			) {
				item.class ??= child.class
				item.children.length = 0
				item.children.push(...child.children)
				hasChanged = true
				break
			}
		}
	}

	// merging
	for (let i = roots.length - 2; i >= 0; i--) {
		const cur = roots[i]
		const next = roots[i + 1]
		if (canMerge(cur, next)) {
			if (isStr(cur) && isStr(next)) {
				roots[i] += next
			} else if (!isStr(cur) && !isStr(next)) {
				cur.children.push(...next.children)
			}
			roots.splice(i + 1)
			hasChanged = true
		}
	}

	// trimming paragraphs
	if (roots.length > 0) {
		const first = roots[0]
		if (!isStr(first) && first.kind === 'p' && first.children.length === 0) roots.shift()
	}
	if (roots.length > 0) {
		const last = roots[roots.length - 1]
		if (!isStr(last) && last.kind === 'p' && last.children.length === 0) roots.pop()
	}

	return hasChanged
}
