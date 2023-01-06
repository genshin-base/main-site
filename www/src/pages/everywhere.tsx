import { Greetings } from '#src/components/greetings'
import { ItemAvatar } from '#src/containers/item-cards/item-avatars'
import { I18N_BEST_CHAR_BUILDS, I18N_PAGE_TITLE_POSTFIX, I18N_WE_ARE_EVERYWHERE } from '#src/i18n/i18n'
import { useDocumentTitle } from '#src/utils/hooks'
import { ourPagesInSocialNetworks } from '#src/utils/our-pages-in-social-networks'

export function EverywherePage(): JSX.Element {
	useDocumentTitle(I18N_WE_ARE_EVERYWHERE + I18N_PAGE_TITLE_POSTFIX)
	return (
		<div className="everywhere container">
			<div className="row">
				<div class="d-none d-lg-block col-lg-9">
					<Greetings isClosable={false} />
				</div>
				<div class="col-lg-3 col-12">
					<div className="d-lg-none">
						<h2 className="fw-bolder fst-italic text-center mb-3">{I18N_BEST_CHAR_BUILDS}</h2>
					</div>
					<div className="">
						<h4 className="fw-bolder text-center mt-2 mb-3 text-muted">
							{I18N_WE_ARE_EVERYWHERE}
						</h4>
					</div>
					{ourPagesInSocialNetworks.map(g => (
						<div className="card mb-3" key={g.title}>
							<div className="card-header">{g.title}</div>
							<ul className="list-group list-group-flush">
								{g.links.map(l => (
									<li className="list-group-item" key={l.title}>
										<a href={l.href}>
											<ItemAvatar src={l.favicon} classes="small-avatar me-3" />
											{l.title}
										</a>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
