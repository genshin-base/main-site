import { useMemo } from 'preact/hooks'

import './App.scss'

export function App() {
	const world = useMemo(() => 'World', [])
	return <div>Hello {world}!</div>
}
