import {
	I18N_CHATS,
	I18N_DONATE_US,
	I18N_OUR_DISCORD,
	I18N_OUR_TELEGRAM_RU,
	I18N_OUR_TELEGRAM_UA,
	I18N_SUPPORT_VIA_DON_ALERTS,
	I18N_SUPPORT_VIA_KO_FI_SHORT,
	I18N_TIKTOK_RU,
	I18N_TIKTOK_UA,
	I18N_VIDEOS,
	I18N_YOUTUBE_RU,
	I18N_YOUTUBE_UA,
} from '#src/i18n/i18n'
import {
	LINK_DISCORD_INVITE,
	LINK_DONATION_ALERTS,
	LINK_KO_FI,
	LINK_TELEGRAM_RU,
	LINK_TELEGRAM_UA,
	LINK_TIKTOK_RU,
	LINK_TIKTOK_UA,
	LINK_YOUTUBE_RU,
	LINK_YOUTUBE_UA,
} from './links'

type SocialNetworkGroupCode = 'chats' | 'videos' | 'donations'
export const ourPagesInSocialNetworks: {
	title: string
	code: SocialNetworkGroupCode
	links: { href: string; title: string; favicon: string }[]
}[] = [
	{
		title: I18N_CHATS,
		code: 'chats',
		links: [
			{
				href: LINK_DISCORD_INVITE,
				title: I18N_OUR_DISCORD,
				favicon: 'https://i.imgur.com/Yr1itn9.png',
			},
			{
				href: LINK_TELEGRAM_RU,
				title: I18N_OUR_TELEGRAM_RU,
				favicon: 'https://telegram.org/img/favicon.ico',
			},
			{
				href: LINK_TELEGRAM_UA,
				title: I18N_OUR_TELEGRAM_UA,
				favicon: 'https://telegram.org/img/favicon.ico',
			},
		],
	},
	{
		title: I18N_VIDEOS,
		code: 'videos',
		links: [
			{ href: LINK_YOUTUBE_UA, title: I18N_YOUTUBE_UA, favicon: 'https://i.imgur.com/jruSfn5.png' },
			{ href: LINK_YOUTUBE_RU, title: I18N_YOUTUBE_RU, favicon: 'https://i.imgur.com/jruSfn5.png' },
			{ href: LINK_TIKTOK_UA, title: I18N_TIKTOK_UA, favicon: 'https://i.imgur.com/eq8XizF.png' },
			{ href: LINK_TIKTOK_RU, title: I18N_TIKTOK_RU, favicon: 'https://i.imgur.com/eq8XizF.png' },
		],
	},
	{
		title: I18N_DONATE_US,
		code: 'donations',
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
