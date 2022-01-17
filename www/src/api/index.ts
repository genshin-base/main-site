export function apiGetJSONFile<T>(path: string, signal?: AbortSignal | null): Promise<T> {
	return fetch(process.env.ASSET_PATH + path, { method: 'GET', signal }).then(x => x.json())
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
