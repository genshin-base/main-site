import { useCallback, useRef, useState } from 'preact/hooks'

import { ItemAvatar } from '#src/containers/item-cards/item-avatars'
import {
	I18N_ABOUT_SITE,
	I18N_ARTIFACTS,
	I18N_BUILDS,
	I18N_EQUIPMENT,
	I18N_LANG_NAME,
	I18N_LANG_NAMES,
	I18N_OUR_SOCIAL_NETWORKS,
	I18N_PAGE_WITH_ALL_LINKS,
	I18N_SUPPORT_US,
	I18N_SUPPORT_VIA_DON_ALERTS,
	I18N_SUPPORT_VIA_KO_FI,
	I18N_WEAPONS,
} from '#src/i18n/i18n'
import { paths } from '#src/routes/paths'
import { A, isOnRoute, makeLocationHrefForLang } from '#src/routes/router'
import { useClickAway } from '#src/utils/hooks'
import { LINK_DONATION_ALERTS, LINK_KO_FI } from '#src/utils/links'
import { ourPagesInSocialNetworks } from '#src/utils/our-pages-in-social-networks'
import { VARIATION_SELECTOR } from '#src/utils/typography'
import { GlobeIcon } from './globe-icon'

type Props = { isNavExpanded: boolean }
const isPageActive = routs => routs.some(r => isOnRoute(r))
export function Nav({ isNavExpanded }: Props): JSX.Element {
	return (
		<div className={`collapse navbar-collapse ${isNavExpanded ? 'show' : ''}`}>
			<ul className="navbar-nav me-auto mb-2 mb-md-0">
				<li className="nav-item">
					<A
						className={`nav-link ${
							isPageActive([paths.builds, paths.buildCharacters]) ? ' active' : ''
						}`}
						href={paths.builds[0]}
					>
						{I18N_BUILDS}
					</A>
				</li>
				<EquipmentDd />
			</ul>
			<ul className="navbar-nav mb-2 mb-md-0 float-md-end">
				<LinksDd />
				<li className="nav-item">
					<A
						className={`nav-link ${isPageActive([paths.about]) ? ' active' : ''}`}
						href={paths.about[0]}
					>
						{I18N_ABOUT_SITE}
					</A>
				</li>
				<DonationDd />
				<LangSelect />
			</ul>
		</div>
	)
}
type DdLink = {
	title: string | JSX.Element
	href: string
	isExternal?: boolean
	isActive?: boolean
	code?: string
	favicon?: string
}
const LINKS_DD_LINKS: DdLink[] = ourPagesInSocialNetworks
	.filter(g => g.code !== 'donations')
	.map(g => g.links)
	.flat()
	.map(({ href, title, favicon }) => {
		return {
			title,
			href,
			favicon,
			isExternal: true,
		}
	})
	.concat([
		{
			title: I18N_PAGE_WITH_ALL_LINKS,
			href: '/everywhere',
			isExternal: false,
			favicon: '',
		},
	])
function LinksDd(): JSX.Element {
	return <HeadDd title={I18N_OUR_SOCIAL_NETWORKS} ddLinks={LINKS_DD_LINKS} />
}
const SUPPORT_DD_LINKS: DdLink[] = [
	{
		title: I18N_SUPPORT_VIA_KO_FI,
		href: LINK_KO_FI,
		isExternal: true,
	},
	{
		title: I18N_SUPPORT_VIA_DON_ALERTS,
		href: LINK_DONATION_ALERTS,
		isExternal: true,
	},
]
function DonationDd(): JSX.Element {
	return <HeadDd title={I18N_SUPPORT_US} ddLinks={SUPPORT_DD_LINKS} />
}
const EQUIPMENT_DD_LINKS: DdLink[] = [
	{
		title: I18N_WEAPONS,
		href: '/weapons',
		code: 'weapons',
	},
	{
		title: I18N_ARTIFACTS,
		href: '/artifacts',
		code: 'artifacts',
	},
]
function EquipmentDd(): JSX.Element {
	const ddLinksLocal = EQUIPMENT_DD_LINKS.map(l => {
		return {
			...l,
			isActive: isPageActive([paths[l.code]]),
		}
	})
	return <HeadDd title={I18N_EQUIPMENT} ddLinks={ddLinksLocal} />
}

function HeadDd({ title, ddLinks }: { title: string | JSX.Element; ddLinks: DdLink[] }): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false)
	const ddRef = useRef(null)
	const targetRef = useRef(null)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const toggleDd = useCallback(() => setIsExpanded(!isExpanded), [setIsExpanded, isExpanded])

	useClickAway([ddRef, targetRef], closeDd)
	const isActive = ddLinks.some(l => l.isActive)
	return (
		<li className="nav-item dropdown">
			<a
				ref={targetRef}
				className={`nav-link dropdown-toggle ${isActive ? 'active' : ''} ${isExpanded ? 'show' : ''}`}
				id="navbarDropdown"
				role="button"
				onClick={toggleDd}
			>
				{title}
			</a>
			<ul className={`dropdown-menu ${isExpanded ? 'show' : ''}`} style={'right: 0'} ref={ddRef}>
				{isExpanded
					? ddLinks.map(l => (
							<li key={l.href} onClick={closeDd}>
								<A
									className={`dropdown-item ${l.isActive ? 'active' : ''}`}
									href={l.href}
									isExternal={l.isExternal}
								>
									{l.favicon && (
										<ItemAvatar
											src={l.favicon}
											classes="emoji-avatar me-1 align-middle"
										/>
									)}
									{l.title}
								</A>
							</li>
					  ))
					: null}
			</ul>
		</li>
	)
}
// const LANG_DD_LINKS: DdLink[] = BUNDLE_ENV.LANGS.map(lang => {
// 	return {
// 		title: I18N_LANG_NAMES[lang],
// 		href: makeLocationHrefForLang(lang),
// 		isActive: I18N_LANG_NAMES[lang] === I18N_LANG_NAME,
// 	}
// })
function LangSelect(): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false)
	const ddRef = useRef(null)
	const targetRef = useRef(null)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const toggleDd = useCallback(() => setIsExpanded(!isExpanded), [setIsExpanded, isExpanded])

	useClickAway([ddRef, targetRef], closeDd)

	return (
		<li className="nav-item dropdown">
			<a
				ref={targetRef}
				className={`nav-link dropdown-toggle ${isExpanded ? 'show' : ''}`}
				id="navbarDropdown"
				role="button"
				onClick={toggleDd}
			>
				<GlobeIcon />
				{VARIATION_SELECTOR} {I18N_LANG_NAME}
			</a>
			{/* todo почему-то не добавляется класс dropdown-menu-end */}
			<ul className={`dropdown-menu ${isExpanded ? 'show' : ''}`} style={'right: 0'} ref={ddRef}>
				{/* В переключатеях будут неправильные ссылки, если сменится страница,
						а список языков не будет перерендерен (если тут таки появится useMemo).
						Так что явно генерим сожержимое списка после разворачивания дропдауна. */}
				{isExpanded &&
					BUNDLE_ENV.LANGS.map(lang => {
						const langName = I18N_LANG_NAMES[lang]
						const isActiveLang = langName === I18N_LANG_NAME
						return (
							<li key={lang}>
								<a
									className={`dropdown-item ${isActiveLang ? 'active' : ''}`}
									href={makeLocationHrefForLang(lang)}
								>
									{I18N_LANG_NAMES[lang]}
								</a>
							</li>
						)
					})}
			</ul>
		</li>
	)
}
