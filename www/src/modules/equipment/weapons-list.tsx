import { apiGetWeapons } from '#src/api/endpoints'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import { Spinner } from '#src/components/spinners'
import { WeaponCardTableRow } from '#src/containers/item-cards/line-cards'
import { isLoaded, useFetch } from '#src/utils/hooks'

export function WeaponsList() {
	// const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null)
	const weapons = useFetch(apiGetWeapons, [])

	if (!isLoaded(weapons)) return <Spinner />
	return (
		<>
			<table className="table table-sm">
				<thead className="bg-dark">
					<tr>
						<th scope="col">name</th>
						<th scope="col">atk</th>
						<th scope="col">substat</th>
						<MobileDesktopSwitch
							childrenDesktop={<th scope="col">passive</th>}
							childrenMobile={null}
						/>
						<th scope="col"></th>
					</tr>
				</thead>
				<tbody>
					{isLoaded(weapons) &&
						weapons.map((w, i) => <WeaponCardTableRow weapon={w} key={w.code} group={i % 2} />)}
				</tbody>
			</table>
		</>
	)
}
