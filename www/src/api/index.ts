export function apiGetJSONFile<T>(path: string, signal?: AbortSignal | null): Promise<T> {
	return fetch(path, { method: 'GET', signal }).then(x => x.json())
}
