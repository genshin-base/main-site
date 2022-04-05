import { BtnTabGroup, Tabs } from '#src/components/tabs'
import { MegaSearch } from '#src/containers/mega-search'
import { I18N_CHAR_EQUIPMENT, I18N_PAGE_TITLE_POSTFIX } from '#src/i18n/i18n'
import { useDocumentTitle } from '#src/utils/hooks'

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
	useDocumentTitle(selectedCat.title + I18N_PAGE_TITLE_POSTFIX)
	return (
		<div className="equipment container">
			<MegaSearch />
			<h1 className="my-1 letter-spacing-1">{I18N_CHAR_EQUIPMENT}</h1>
			<div className="d-none d-xl-flex">
				<Tabs classes="w-100" tabs={cats} onTabSelect={selectCat} selectedTab={selectedCat} />
			</div>
			<div className="d-block d-xl-none">
				<BtnTabGroup
					tabs={cats}
					onTabSelect={selectCat}
					selectedTab={selectedCat}
					classes="w-100 mb-2 btn-group-sm"
				/>
			</div>
			<WeaponsList />
		</div>
	)
}
