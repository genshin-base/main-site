import { I18N_BUILDS, I18N_EQUIPMENT, I18N_HOME, I18N_SEARCH } from '#src/i18n/i18n'
import { paths } from '#src/routes/paths'
import { A, isOnRoute } from '#src/routes/router'
import { useCheckIfPageBottomReached, useScrollDirection } from '#src/utils/hooks'
import { getIconSrc } from '#src/utils/icons'
import { ItemAvatar } from './item-cards/item-avatars'

import './bottom-tab-bar.scss'

type bottomTab = {
	text: string
	iconSrc: string
	href: string
	onClick?: (e: Event) => void
	isPageActive: () => boolean
}
const checkRouts = routs => routs.some(r => isOnRoute(r))
const tabs: bottomTab[] = [
	{
		text: I18N_HOME,
		iconSrc: getIconSrc('home'),
		href: '/',
		isPageActive: () => checkRouts([paths.front]),
	},
	{
		text: I18N_BUILDS,
		iconSrc: getIconSrc('characters'),
		href: paths.builds[0],
		isPageActive: () => checkRouts([paths.builds, paths.buildCharacters]),
	},
	{
		text: I18N_EQUIPMENT,
		iconSrc: getIconSrc('equipment'),
		href: 'weapons',
		isPageActive: () => checkRouts([paths['weapons'], paths['artifacts']]),
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
		isPageActive: () => checkRouts([]),
	},
]
export function BottomTabBar() {
	const scrollDirection = useScrollDirection()
	const isBottomReached = useCheckIfPageBottomReached()
	return (
		<ul
			class={`nav bottom-tab-bar w-100 justify-content-between ${
				scrollDirection === 'up' || isBottomReached ? 'not-muted' : 'muted-a-little'
			}`}
		>
			{tabs.map(t => {
				return (
					<li className="nav-item" onClick={t.onClick}>
						<A
							className={`nav-link ${
								t.isPageActive() ? ' active' : ''
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
