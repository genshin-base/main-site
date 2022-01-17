import { Tabs } from '#src/components/tabs'

import { useCallback, useMemo, useState } from 'preact/hooks'
import { WeaponsList } from './weapons-list'
const cats = [
	{ title: 'Weapons', code: 'weapons' },
	{ title: 'Artifacts', code: 'artifacts' },
]
export function Equipment() {
	const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null)
	const selectCat = useCallback(tab => setSelectedCatCode(tab.code), [setSelectedCatCode])
	const selectedCat = useMemo(
		() => cats.find(c => c.code === selectedCatCode) || cats[0],
		[selectedCatCode],
	)
	return (
		<div className="equipment container">
			<h1 className="my-1">Character equipment</h1>
			<Tabs classes="w-100" tabs={cats} onTabSelect={selectCat} selectedTab={selectedCat} />
			<WeaponsList />
		</div>
	)
}
