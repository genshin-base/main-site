import { useState } from 'preact/hooks'

import { WeaponRegularInfo } from '#lib/parsing/combine'
import { WeaponCardTableRow } from '#src/containers/item-cards/line-cards'

const adds = { typeCode: 'sword', rarity: 4, obtainSources: ['quests'], materialCodes: [] }
const weapons = [
	// {
	// 	name: '',
	// 	code: '',
	// 	atk: {base:, max:},
	// 	subStat: {base:, max:},
	// 	passiveStat: '',
	// 	recommendedTo: ['']
	// },
	{
		name: 'фыотлвот толфывто тото',
		code: 'выа',
		atk: { base: 23, max: 4235 },
		subStat: { base: 512, max: 14214, code: 'atk' },
		passiveStat:
			'тофыв тофдлты ошрифывтло лоитлоитлофолт ол о лоилои ло лоф иолоитлофолт ол о лоилои ло лоф иол ьбл офдлты ошрифывтло л л ьбл офдлты ошрифывтло ллофолт ол о лоилои ло лоф иол ьбл офдлты ошрифывтло лоитлофолт ол о лоилои ло лоф иол ьбллои лои офдлты ошрифывтло лоитлофолт ол о лоилои ло лоф иол ьбллои офы вотт офт',
		recommendedTo: [''],
		...adds,
	},
	{
		name: 'олтфт отфо тто тото',
		code: 'сми',
		atk: { base: 41, max: 4125 },
		subStat: { base: 41, max: 5125, code: 'atk' },
		passiveStat: 'ьлдфыьв льфыв ьфыдлдлтыптфдла фыт лтф л',
		recommendedTo: [''],
		...adds,
	},
	{
		name: 'фывв фв фы',
		code: 'фыаип',
		atk: { base: 12, max: 5123 },
		subStat: { base: 23, max: 532, code: 'atk' },
		passiveStat: 'лтфыв итьвтфолт лдфытволргтфдлт олиц от дьдьдт т',
		recommendedTo: [''],
		...adds,
	},
	{
		name: 'иоои тофт раиоиа',
		code: 'пбилдбьроиип',
		atk: { base: 235, max: 2533, code: 'atk' },
		subStat: { base: 23, max: 52322 },
		passiveStat: 'еоеоеоео ео лп пфт тпппт ф фцвсф лооц т т',
		recommendedTo: [''],
	},
	{
		name: 'тфывтт оф',
		code: 'ььь',
		atk: { base: 23, max: 235523, code: 'atk' },
		subStat: { base: 53, max: 32523 },
		passiveStat: 'офдлты ошрифывтло лоитлофолт ол о лоилои ло лоф иол ьбллои',
		recommendedTo: [''],
		...adds,
	},
] as WeaponRegularInfo[]
export function WeaponsList() {
	const [selectedCatCode, setSelectedCatCode] = useState<string | null>(null)
	console.log(weapons)
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
				{weapons.map((w, i) => (
					<WeaponCardTableRow weapon={w} key={w.code} group={i % 2} />
				))}
			</tbody>
		</table>
	)
}
