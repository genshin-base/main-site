import { useCallback } from 'preact/hooks'

import { isPageActive } from '#src/components/nav'
import { I18N_BUILDS, I18N_EQUIPMENT, I18N_HOME, I18N_SEARCH } from '#src/i18n/i18n'
import { paths } from '#src/routes/paths'
import { A } from '#src/routes/router'
import { getIconSrc } from '#src/utils/icons'
import { ItemAvatar } from './item-cards/item-avatars'

import './bottom-tab-bar.scss'

type bottomTab = {
	text: string
	iconSrc: string
	href: string
	onClick?: (e: Event) => void
}
const tabs: bottomTab[] = [
	{
		text: I18N_HOME,
		iconSrc: getIconSrc('home'),
		href: '/',
	},
	{
		text: I18N_BUILDS,
		iconSrc: getIconSrc('characters'),
		href: paths.builds[0],
	},
	{
		text: I18N_EQUIPMENT,
		iconSrc: getIconSrc('equipment'),
		href: 'weapons',
	},
	{
		text: I18N_SEARCH,
		iconSrc: getIconSrc('search'),
		href: '#',
		onClick: e => {
			e.preventDefault()
			const searchEl = document.querySelector('.mega-search input') as HTMLInputElement | null
			console.log(searchEl)
			if (searchEl) searchEl.focus()
		},
	},
]
export function BottomTabBar() {
	return (
		<ul class="nav bottom-tab-bar w-100 justify-content-between">
			{tabs.map(t => {
				return (
					<li className="nav-item" onClick={t.onClick}>
						<A
							className={`nav-link ${
								isPageActive([paths.builds, paths.buildCharacters, paths['weapons'], ''])
									? ' active'
									: ''
							} d-flex flex-column align-items-center px-3`}
							href={t.href}
						>
							<ItemAvatar
								src={t.iconSrc}
								isNoBg={true}
								classes="small-avatar align-middle artifact-main-stat-icon webapp-icon-shadow"
							/>
							<span className="small">{t.text}</span>
						</A>
					</li>
				)
			})}
		</ul>
	)
}
