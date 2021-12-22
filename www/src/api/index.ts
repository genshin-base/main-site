export function apiGetJSONFile<T>(path: string, signal?: AbortSignal | null): Promise<T> {
	return fetch(process.env.ASSET_PATH + path, { method: 'GET', signal }).then(x => x.json())
}
