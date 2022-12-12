import { Greetings } from '#src/components/greetings'
import { ItemAvatar } from '#src/containers/item-cards/item-avatars'
import {
	I18N_CHATS,
	I18N_DONATE_US,
	I18N_OUR_DISCORD,
	I18N_OUR_TELEGRAM,
	I18N_PAGE_TITLE_POSTFIX,
	I18N_SUPPORT_VIA_DON_ALERTS,
	I18N_SUPPORT_VIA_KO_FI_SHORT,
	I18N_TIKTOK_RU,
	I18N_TIKTOK_UA,
	I18N_VIDEOS,
	I18N_WE_ARE_EVERYWHERE,
	I18N_YOUTUBE_RU,
	I18N_YOUTUBE_UA,
} from '#src/i18n/i18n'
import { useDocumentTitle } from '#src/utils/hooks'
import {
	LINK_DISCORD_INVITE,
	LINK_DONATION_ALERTS,
	LINK_KO_FI,
	LINK_TELEGRAM_RU,
	LINK_TIKTOK_RU,
	LINK_TIKTOK_UA,
	LINK_YOUTUBE_RU,
	LINK_YOUTUBE_UA,
} from '#src/utils/links'

const groups: { title: string; links: { href: string; title: string; favicon: string }[] }[] = [
	{
		title: I18N_CHATS,
		links: [
			{
				href: LINK_DISCORD_INVITE,
				title: I18N_OUR_DISCORD,
				favicon: 'https://i.imgur.com/Yr1itn9.png',
			},
			{
				href: LINK_TELEGRAM_RU,
				title: I18N_OUR_TELEGRAM,
				favicon: 'https://telegram.org/img/favicon.ico',
			},
		],
	},
	{
		title: I18N_VIDEOS,
		links: [
			{ href: LINK_YOUTUBE_UA, title: I18N_YOUTUBE_UA, favicon: 'https://i.imgur.com/jruSfn5.png' },
			{ href: LINK_YOUTUBE_RU, title: I18N_YOUTUBE_RU, favicon: 'https://i.imgur.com/jruSfn5.png' },
			{ href: LINK_TIKTOK_UA, title: I18N_TIKTOK_UA, favicon: 'https://i.imgur.com/eq8XizF.png' },
			{ href: LINK_TIKTOK_RU, title: I18N_TIKTOK_RU, favicon: 'https://i.imgur.com/eq8XizF.png' },
		],
	},
	{
		title: I18N_DONATE_US,
		links: [
			{
				href: LINK_KO_FI,
				title: I18N_SUPPORT_VIA_KO_FI_SHORT,
				favicon: 'https://ko-fi.com/favicon.ico',
			},
			{
				href: LINK_DONATION_ALERTS,
				title: I18N_SUPPORT_VIA_DON_ALERTS,
				favicon: 'https://www.donationalerts.com/favicon-96x96.png',
			},
		],
	},
]
export function EverywherePage(): JSX.Element {
	useDocumentTitle(I18N_WE_ARE_EVERYWHERE + I18N_PAGE_TITLE_POSTFIX)
	return (
		<div className="everywhere container">
			<h1 className={`my-1 mb-3 letter-spacing-1 ${BUNDLE_ENV.LANG === 'en' ? 'text-capitalize' : ''}`}>
				{I18N_WE_ARE_EVERYWHERE}
			</h1>
			<div className="row">
				<div class="d-none d-lg-block col-lg-9">
					<Greetings isClosable={false} />
				</div>
				<div class="col-lg-3 col-12">
					{groups.map(g => (
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
