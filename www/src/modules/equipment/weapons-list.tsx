import { BtnTabGroup } from '#src/components/tabs'
import { useCallback, useMemo, useState } from 'preact/hooks'
const cats = [
	{ title: 'Weapons', code: 'weapons' },
	{ title: 'Artifacts', code: 'artifacts' },
]
const weapons = new Array(23).fill('1') //todo
export function WeaponsList() {
	const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null)
	const selectCat = useCallback(tab => setSelectedCatCode(tab.code), [setSelectedCatCode])
	const selectedCat = useMemo(
		() => cats.find(c => c.code === selectedCatCode) || cats[0],
		[selectedCatCode],
	)
	console.log(weapons)
	return (
		<div>
			{weapons.map(w => (
				<div className="row">
					<div className="col">1</div>
					<div className="col">2</div>
					<div className="col">3</div>
				</div>
			))}
		</div>
	)
}
