import { useMemo } from 'preact/hooks'

import { LightBtnTabGroup, Tabs } from '#src/components/tabs'
import {
	I18N_ARTIFACTS,
	I18N_CHAR_EQUIPMENT,
	I18N_EQUIPMENT_PAGE_DESCRIPTION,
	I18N_PAGE_TITLE_POSTFIX,
	I18N_WEAPONS,
} from '#src/i18n/i18n'
import { useDocumentTitle, usePageDescription } from '#src/utils/hooks'
import { ArtifactsList } from './artifacts-list'
import { WeaponsList } from './weapons-list'

const cats = [
	{ title: I18N_WEAPONS, code: 'weapons', href: '/weapons' },
	{ title: I18N_ARTIFACTS, code: 'artifacts', href: '/artifacts' },
]

export function Equipment({ code }: { code: 'weapons' | 'artifacts' }) {
	const selectedCat = useMemo(() => cats.find(c => c.code === code) || cats[0], [code])

	useDocumentTitle(selectedCat.title + I18N_PAGE_TITLE_POSTFIX)

	usePageDescription(() => I18N_EQUIPMENT_PAGE_DESCRIPTION(code))

	return (
		<div className="equipment container">
			<h1 className="my-1 letter-spacing-1">{I18N_CHAR_EQUIPMENT}</h1>
			<div className="d-none d-xl-flex">
				<Tabs classes="w-100 mt-3" tabs={cats} selectedTab={selectedCat} />
			</div>
			<div className="d-block d-xl-none">
				<LightBtnTabGroup
					tabs={cats}
					selectedTab={selectedCat}
					classes="w-100 mt-3 mb-2 btn-group-sm"
				/>
			</div>
			{code === 'weapons' ? <WeaponsList /> : <ArtifactsList />}
		</div>
	)
}
