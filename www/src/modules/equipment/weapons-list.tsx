import { apiGetWeapons } from '#src/api/endpoints'
import { WeaponCardTableRow } from '#src/containers/item-cards/line-cards'
import { isLoaded, useFetch } from '#src/utils/hooks'

export function WeaponsList() {
	// const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null)
	const weapons = useFetch(apiGetWeapons, [])

	return (
		<table className="table table-sm">
			<thead className="bg-dark">
				<tr>
					<th scope="col">name</th>
					<th scope="col">akt</th>
					<th scope="col">substat name</th>
					<th scope="col">substat value</th>
					<th scope="col">passive</th>
					<th scope="col"></th>
				</tr>
			</thead>
			<tbody>
				TODO:loading
				{isLoaded(weapons) &&
					weapons.map((w, i) => <WeaponCardTableRow weapon={w} key={w.code} group={i % 2} />)}
			</tbody>
		</table>
	)
}
