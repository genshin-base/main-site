import { useCallback, useRef, useState } from 'preact/hooks'

import { $LANG_NAME, $LANG_NAMES } from '#src/i18n'
import { A, makeLocationHrefForLang } from '#src/routes/router'
import { useClickAway } from '#src/utils/hooks'
import { VARIATION_SELECTOR } from '#src/utils/typography'

type Props = { isNavExpanded: boolean }

export function Nav({ isNavExpanded }: Props): JSX.Element {
	const [isExpanded, setIsExpanded] = useState(false)
	const ddRef = useRef(null)
	const closeDd = useCallback(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded])
	const openDd = useCallback(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded])

	// TODO клик мимо компонента
	useClickAway(ddRef, closeDd)

	return (
		<div className={`collapse navbar-collapse ${isNavExpanded ? 'show' : ''}`}>
			<ul className="navbar-nav me-auto mb-2 mb-md-0">
				<li className="nav-item">
					<A className="nav-link active" href="/builds">
						Builds
					</A>
				</li>
				<li className="nav-item">
					<a className="nav-link active" href="#">
						About
					</a>
				</li>
			</ul>
			<ul className="navbar-nav mb-2 mb-md-0 float-md-end">
				<li className="nav-item dropdown">
					<a
						className={`nav-link dropdown-toggle ${isExpanded ? 'show' : ''}`}
						id="navbarDropdown"
						role="button"
						onClick={openDd}
					>
						🌐{VARIATION_SELECTOR} {$LANG_NAME}
					</a>
					{/* todo почему-то не добавляется класс dropdown-menu-end */}
					<ul
						className={`dropdown-menu ${isExpanded ? 'show' : ''}`}
						style={'right: 0'}
						ref={ddRef}
					>
						{/* В переключатеях будут неправильные ссылки, если сменится страница,
						а список языков не будет перерендерен (если тут таки появится useMemo).
						Так что явно генерим сожержимое списка после разворачивания дропдауна. */}
						{isExpanded &&
							BUNDLE_ENV.LANGS.map(lang => (
								<li key={lang}>
									<a className="dropdown-item" href={makeLocationHrefForLang(lang)}>
										{$LANG_NAMES[lang]}
									</a>
								</li>
							))}
					</ul>
				</li>
			</ul>
		</div>
	)
}
