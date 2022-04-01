import { useCallback, useRef, useState } from 'preact/hooks'

import {
	I18N_ABOUT_SITE,
	I18N_BUILDS,
	I18N_LANG_NAME,
	I18N_LANG_NAMES,
	I18N_OUR_DISCORD,
	I18N_SUPPORT_US,
	I18N_SUPPORT_VIA_DON_ALERTS,
	I18N_SUPPORT_VIA_KO_FI,
} from '#src/i18n/i18n'
import { paths } from '#src/routes/paths'
import { A, isOnRoute, makeLocationHrefForLang } from '#src/routes/router'
import { useClickAway } from '#src/utils/hooks'
import { VARIATION_SELECTOR } from '#src/utils/typography'
import { GlobeIcon } from './globe-icon'
import { LINK_DISCORD_INVITE, LINK_DONATION_ALERTS, LINK_KO_FI } from '#src/utils/links'

type Props = { isNavExpanded: boolean }

export function Nav({ isNavExpanded }: Props): JSX.Element {
	const isPageActive = routs => routs.some(r => isOnRoute(r))
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
				<li className="nav-item">
					<A
						className={`nav-link ${isPageActive([paths.about]) ? ' active' : ''}`}
						href={paths.about[0]}
					>
						{I18N_ABOUT_SITE}
					</A>
				</li>
				<li className="nav-item">
					<a className="nav-link" target="_blank" href={LINK_DISCORD_INVITE}>
						{I18N_OUR_DISCORD}
					</a>
				</li>
			</ul>
			<ul className="navbar-nav mb-2 mb-md-0 float-md-end">
				<DonationDd />
				<LangSelect />
			</ul>
		</div>
	)
}
function LangSelect(): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false)
	const ddRef = useRef(null)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])

	// TODO клик мимо компонента
	useClickAway(ddRef, closeDd)

	return (
		<li className="nav-item dropdown">
			<a
				className={`nav-link dropdown-toggle ${isExpanded ? 'show' : ''}`}
				id="navbarDropdown"
				role="button"
				onClick={openDd}
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
function DonationDd(): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false)
	const ddRef = useRef(null)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])

	// TODO клик мимо компонента
	useClickAway(ddRef, closeDd)

	return (
		<li className="nav-item dropdown">
			<a
				className={`nav-link dropdown-toggle ${isExpanded ? 'show' : ''}`}
				id="navbarDropdown"
				role="button"
				onClick={openDd}
			>
				{I18N_SUPPORT_US}
			</a>
			<ul className={`dropdown-menu ${isExpanded ? 'show' : ''}`} style={'right: 0'} ref={ddRef}>
				{isExpanded ? (
					<>
						<li>
							<a className={`dropdown-item `} href={LINK_KO_FI} target="_blank">
								{I18N_SUPPORT_VIA_KO_FI}
							</a>
						</li>
						<li>
							<a className={`dropdown-item `} href={LINK_DONATION_ALERTS} target="_blank">
								{I18N_SUPPORT_VIA_DON_ALERTS}
							</a>
						</li>
					</>
				) : null}
			</ul>
		</li>
	)
}
