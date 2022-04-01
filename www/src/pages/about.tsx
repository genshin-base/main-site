import { I18N_ABOUT_SITE_CONTENT, I18N_ABOUT_SITE_EPIGRAPH } from '#src/i18n/about-site'
import { I18N_ABOUT_SITE, I18N_PAGE_TITLE_POSTFIX } from '#src/i18n/i18n'
import { useDocumentTitle } from '#src/utils/hooks'

export function AboutPage(): JSX.Element {
	useDocumentTitle(I18N_ABOUT_SITE + I18N_PAGE_TITLE_POSTFIX)
	return (
		<div className="builds container">
			<h1 className={`my-1 letter-spacing-1 ${BUNDLE_ENV.LANG === 'en' ? 'text-capitalize' : ''}`}>
				{I18N_ABOUT_SITE}
			</h1>
			<div className="row">
				{/* todo ссылки на страницы, перевод */}
				<figure className="text-end">
					<blockquote className="blockquote">
						<p>{I18N_ABOUT_SITE_EPIGRAPH.quote}</p>
					</blockquote>
					<figcaption className="blockquote-footer">
						{I18N_ABOUT_SITE_EPIGRAPH.footer} <cite>{I18N_ABOUT_SITE_EPIGRAPH.cite}</cite>
					</figcaption>
				</figure>
				<div className="col-md-7 offset-md-1">{I18N_ABOUT_SITE_CONTENT}</div>
				<div className="text-muted text-end">28.03.2022</div>
			</div>
		</div>
	)
}
