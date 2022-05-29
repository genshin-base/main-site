import { decodeObjLocations } from '#lib/genshin'
import { DomainShortInfo, EnemyShortInfo, ItemShortInfo } from '#lib/parsing/combine'

export function apiGetJSONFile<T>(path: string, signal?: AbortSignal | null): Promise<T> | T {
	if (BUNDLE_ENV.IS_SSR) {
		return JSON.parse(SSR_ENV.readPublic(path))
	} else {
		return fetch(BUNDLE_ENV.ASSET_PATH + path, { method: 'GET', signal }).then(x => x.json())
	}
}

type MapByCodeInner<T> = T extends (infer A)[] ? (A extends { code: string } ? Map<string, A> : never) : never

export type MapAllByCode<T> = T & {
	maps: {
		[K in keyof T as T[K] extends (infer A)[]
			? A extends { code: string }
				? K
				: never
			: never]: MapByCodeInner<T[K]>
	}
}

export function mapAllByCode<T>(obj: T): MapAllByCode<T> {
	// @ts-ignore
	const maps: MapAllByCode<T>['maps'] = {}
	for (const attr in obj) {
		const val = obj[attr]
		if (Array.isArray(val) && (val.length === 0 || 'code' in val[0])) {
			// @ts-ignore
			maps[attr] = new Map(val.map(x => [x.code, x]))
		}
	}
	return Object.assign({}, obj, { maps })
}

export function decodeRelatedLocations<T extends { items?: ItemShortInfo[]; enemies?: EnemyShortInfo[] }>(
	rel: T,
): T {
	if (rel.items) for (const item of rel.items) decodeObjLocations(item)
	if (rel.enemies) for (const enemy of rel.enemies) decodeObjLocations(enemy)
	return rel
}

export type RelItemsShort = { items: Map<string, ItemShortInfo> }
export type RelDomainsShort = { domains: Map<string, DomainShortInfo> }
export type RelEnemiesShort = { enemies: Map<string, EnemyShortInfo> }

export function getAllRelated<T>(map: Map<string, T>, codes: string[]): T[] {
	const res: T[] = []
	for (const code of codes) {
		const item = map.get(code)
		if (item !== undefined) res.push(item)
	}
	return res
}

/*
type MergeNestedInner<TBase, T> = T & {
	[K in keyof T as K extends 'materialCodes'
		? 'materials'
		: K extends 'domainCodes'
		? 'domains'
		: K extends 'enemyCodes'
		? 'enemies'
		: K]: K extends 'materialCodes'
		? TBase extends { items: (infer TItem)[] }
			? TItem[]
			: never
		: K extends 'domainCodes'
		? TBase extends { domains: (infer TDomain)[] }
			? TDomain[]
			: never
		: K extends 'enemyCodes'
		? TBase extends { enemies: (infer TEnemy)[] }
			? TEnemy[]
			: never
		: MergeNestedInner<TBase, T[K]>
}

type WithNested_<T, TArt, TItem, TDomain, TEnemy> = T & {
	[K in keyof T as K extends 'materialCodes'
		? 'materials'
		: K extends 'domainCodes'
		? 'domains'
		: K extends 'enemyCodes'
		? 'enemies'
		: K]: K extends 'materialCodes'
		? TItem
		: K extends 'domainCodes'
		? TDomain
		: K extends 'enemyCodes'
		? TEnemy
		: WithNested_<T[K], TItem, TDomain, TEnemy>
}

type WithNestedAuto<T> = WithNested_<
	T,
	T extends { items: (infer TItem)[] } ? TItem[] : never,
	T extends { artifacts: (infer TArt)[] } ? TArt[] : never,
	T extends { domains: (infer TDomain)[] } ? TDomain[] : never,
	T extends { enemies: (infer TEnemy)[] } ? TEnemy[] : never
>

export type WithNested<T> = MergeNestedInner<T, T>

export function addNested<T>(obj: T): WithNested<T> {
	const mapsCache = {}
	function getAllByCode(codes, attr) {
		if (!(attr in obj)) throw new Error(`no attr '${attr}' in obj`)
		const map = (mapsCache[attr] = mapsCache[attr] ?? new Map(obj[attr].map(x => [x.code, x])))
		const res: unknown[] = []
		for (const code of codes) {
			const item = map.get(code)
			if (item) res.push(item)
		}
		return res
	}

	const relatedAttrMap = {
		materialCodes: ['materials', 'items'],
		domainCodes: ['domains', 'domains'],
		enemyCodes: ['enemies', 'enemies'],
	}
	function mergeInner(cur) {
		if (cur === null || typeof cur !== 'object') return cur

		for (const attr in cur) {
			mergeInner(cur[attr])
			const rel = relatedAttrMap[attr]
			if (rel) cur[rel[0]] = getAllByCode(cur[attr], rel[1])
		}
	}

	mergeInner(obj)
	return obj as WithNested<T>
}
*/

/*
type ItemsWithCodeAttrs<T> = {
	[K in keyof T]: T[K] extends (infer A)[] ? (A extends { code: string } ? K : never) : never
}[keyof T]

export function mapByCode<T, K extends ItemsWithCodeAttrs<T>>(obj: T, attrs: K[]): MapByCode<T, K> {
	// @ts-ignore
	const maps: MapByCode<T, K>['maps'] = {}
	for (const attr of attrs) {
		// @ts-ignore
		maps[attr] = new Map(obj[attr].map(x => [x.code, x]))
	}
	return Object.assign({}, obj, { maps })
}
*/
