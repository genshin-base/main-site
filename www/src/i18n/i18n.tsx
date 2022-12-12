import {
	GI_ArtifactGroupCode,
	GI_ArtifactTypeCode,
	GI_KnownStatBonusCode,
	GI_WeaponObtainSource,
	GI_WeaponTypeCode,
	MapCode,
} from '#lib/genshin'
import { GI_TalentCode } from '#lib/parsing/helperteam/types'
import { LINK_DISCORD_INVITE } from '#src/utils/links'
import { BULLET, DASH, ELLIPSIS, NBSP } from '#src/utils/typography'

type Lang = 'en' | 'ru'
export const LANG = BUNDLE_ENV.LANG as Lang
export const I18N_LANG_NAMES: Record<Lang, string> = {
	en: 'English',
	ru: 'Русский',
}
export const I18N_LANG_NAME = I18N_LANG_NAMES[LANG]
export const I18N_PAGE_TITLE_POSTFIX = { en: ` ${BULLET} Genshin Base`, ru: ` ${BULLET} Геншин База` }[LANG]
export const I18N_LOADING = { en: 'Loading', ru: 'Загрузка' }[LANG]
export const I18N_COLLAPSE = { en: 'Collapse', ru: 'Свернуть' }[LANG]
export const I18N_DASHBOARD = { en: 'Dashboard', ru: 'Самое важное' }[LANG]
export const I18N_REGION = { en: 'Region', ru: 'Регион' }[LANG]
export const I18N_UNTIL_DAY_RESET = { en: 'Until Day Reset', ru: 'До нового дня' }[LANG]
export const I18N_ALCHEMY_CALC = { en: 'Alchemy Calculator', ru: 'Калькулятор алхимии' }[LANG]
export const I18N_WHAT_TO_FARM = { en: 'What to Farm', ru: 'Что фармить' }[LANG]
export const I18N_BUILDS = { en: 'Builds', ru: 'Сборки персонажей' }[LANG]
export const I18N_ASIA = { en: 'Asia', ru: 'Азия' }[LANG]
export const I18N_NORH_AMERICA = { en: 'North America', ru: 'Северная Америка' }[LANG]
export const I18N_EUROPE = { en: 'Europe', ru: 'Европа' }[LANG]
export const I18N_MINUTE = { en: 'minute', ru: 'минута' }[LANG]
export const I18N_MINUTES = { en: 'minutes', ru: 'минуты' }[LANG]
export const I18N_MINUTES_3 = { en: 'minutes', ru: 'минут' }[LANG]
export const I18N_TODAY = { en: 'today', ru: 'сегодня' }[LANG]
export const I18N_WEEKDAYS = {
	en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
	ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
}[LANG]
export const I18N_TOMORROW = { en: 'tomorrow', ru: 'завтра' }[LANG]
export const I18N_DUNGEONS = { en: 'Dungeons', ru: 'Подземелья' }[LANG]
export const I18N_TALENTS = { en: 'Talents', ru: 'Таланты' }[LANG]
export const I18N_WEAPONS = { en: 'Weapons', ru: 'Оружие' }[LANG]
export const I18N_MAIN_INFO = { en: 'main info', ru: 'основная информация' }[LANG]
export const I18N_WEAPON_STACKS_COUNT = {
	en: (stacks: number) => stacks + ' ' + pluralizeEN(stacks, 'stack', 'stacks'),
	ru: (stacks: number) => stacks + ' ' + pluralizeRU(stacks, 'стак', 'стака', 'стаков'),
}[LANG]
export const I18N_WEAPON_REFINE = {
	en: (refine: string) => 'R' + refine,
	ru: (refine: string) => 'Р' + refine,
}[LANG]
export const I18N_WHY_ADD_TO_FAVS_TIP = {
	en: 'Add characters or items to your favorites to see them marked here.',
	ru: 'Добавьте персонажей и предметы в избранные, чтобы выделить их здесь',
}[LANG]
export const I18N_FAV_CHARACTERS = { en: 'Favorite characters', ru: 'Избранные персонажи' }[LANG]

export const I18N_FAV_TIPS = {
	en: (() => {
		const add = (s: string) => `Add ${s} to favourites`
		const remove = (s: string) => `Remove ${s} from favourites`
		return {
			add: { weapon: add('weapon'), character: add('character'), material: add('material') },
			remove: {
				weapon: remove('weapon'),
				character: remove('character'),
				material: remove('material'),
			},
		}
	})(),
	ru: (() => {
		const add = (s: string) => `Добавить ${s} в избранное`
		const remove = (s: string) => `Убрать ${s} из избранного`
		return {
			add: { weapon: add('оружие'), character: add('персонажа'), material: add('материал') },
			remove: {
				weapon: remove('оружие'),
				character: remove('персонажа'),
				material: remove('материал'),
			},
		}
	})(),
}[LANG]
export const I18N_CHOOSE_FROM_FAV = {
	en: 'Choose from favorite',
	ru: 'Выберите из избранных',
}[LANG]
export const I18N_ARTIFACTS = { en: 'Artifacts', ru: 'Артефакты' }[LANG]
export const I18N_CHARACTERS = { en: 'Characters', ru: 'Персонажи' }[LANG]
export const I18N_ART_STATS_PRIORITY = { en: 'Artifact stats priority', ru: 'Приоритетные главстаты' }[LANG]
export const I18N_SUBSTATS_PRIORITY = { en: 'Substats priority', ru: 'Приоритетные допстаты' }[LANG]
export const I18N_TALENTS_PRIORITY = { en: 'Talents Priority', ru: 'Приоритетные таланты' }[LANG]
export const I18N_ASC_MATERIALS = { en: 'Ascension materials', ru: 'Материалы возвышения' }[LANG]
export const I18N_FULL_BUILD_INFO = { en: 'Full build info', ru: 'Полная информация о билде' }[LANG]
export const I18N_CHAR_LORE = { en: 'Character lore', ru: 'Лор персонажа' }[LANG]
export const I18N_MORE_ON_BUILDS_PAGE = {
	en: 'more on build page',
	ru: 'продолжение на странице билда',
}[LANG]
export const I18N_BACK = { en: 'Back', ru: 'Назад' }[LANG]
export const I18N_NOTES = { en: 'Notes', ru: 'Примечания' }[LANG]

const artTypeNamesRU: Record<GI_ArtifactTypeCode, string> = {
	flower: 'цветок',
	plume: 'перо',
	sands: 'часы',
	goblet: 'кубок',
	circlet: 'корона',
}
export const I18N_ART_TYPE = {
	en: (code: GI_ArtifactTypeCode) => code as string,
	ru: (code: GI_ArtifactTypeCode) => artTypeNamesRU[code],
}[LANG]

const statNamesRu: Record<GI_KnownStatBonusCode, string> = {
	def: 'защита',
	'def%': '% защиты',
	dmg: 'урон',
	'dmg%': '% урона',
	atk: 'сила атаки',
	'atk%': '% атаки',
	hp: 'ХП',
	'hp%': '% ХП',
	em: 'мастерство стихий',
	er: 'восстановление энергии',
	'er%': '% восстановления энергии',
	healing: 'лечение',
	'healing%': '% лечения',
	'crit-rate': 'шанс крит. попадания',
	'crit-rate%': '%шанса крит. попадания',
	'crit-dmg': 'крит. урон',
	'crit-dmg%': '% крит. урона',
	'phys-dmg': 'физ. урон',
	'cryo-dmg': 'Крио урон',
	'geo-dmg': 'Гео урон',
	'anemo-dmg': 'Анемо урон',
	'hydro-dmg': 'Гидро урон',
	'electro-dmg': 'Электро урон',
	'pyro-dmg': 'Пиро урон',
	'dendro-dmg': 'Дендро урон',
	'phys-dmg%': '% физ. урона',
	'cryo-dmg%': '% Крио урона',
	'geo-dmg%': '% Гео урона',
	'anemo-dmg%': '% Анемо урона',
	'hydro-dmg%': '% Гидро урона',
	'electro-dmg%': '% Электро урона',
	'pyro-dmg%': '% Пиро урона',
	'dendro-dmg%': '% Дендро урона',
}
export const I18N_STAT_NAME = {
	en: (code: string) => code.replace(/-/g, ' '),
	ru: (code: string) => statNamesRu[code] ?? code,
}[LANG]

type TalentTypeNames = Record<GI_TalentCode, string>
const talentTypesNamesRU: TalentTypeNames = {
	attack: 'обычная атака',
	skill: 'элементальный навык',
	burst: 'взрыв стихии',
}
export const I18N_TALENT_NAME = {
	en: (code: GI_TalentCode) => code,
	ru: (code: GI_TalentCode) => talentTypesNamesRU[code],
}[LANG]

type ConjuctionType = 'or' | 'and'
export const I18N_CONJUCTIONS: Record<ConjuctionType, string> = {
	en: { or: 'or', and: 'and' },
	ru: { or: 'или', and: 'и' },
}[LANG]

export const I18N_RECOMMENDED_FOR = { en: 'Recommended for', ru: 'Рекомендуется для' }[LANG]
export const I18N_FOR_NOBODY = { en: 'Nobody', ru: 'Никого' }[LANG]
export const I18N_SOURCE = { en: 'Source', ru: 'Источник' }[LANG]
export const I18N_SCROLL_TO_ZOOM = { en: 'Scroll to zoom', ru: 'Зум колёсиком' }[LANG]
export const I18N_PINCH_TO_ZOOM = { en: 'Pinch to zoom', ru: 'Зум щипком' }[LANG]
export const I18N_CANCEL = { en: 'cancel', ru: 'отмена' }[LANG]
export const I18N_SUBMIT = { en: 'submit', ru: 'отправить' }[LANG]
export const I18N_SUBMIT_BUG_SUCCESS = { en: 'Message sent. Thank you', ru: 'Сообщение отправлено. Спасибо' }[
	LANG
]
export const I18N_SUBMIT_BUG_ERROR = {
	en: 'Error happened while sending message. Please disable adblock or try again later, or contact us on Discord',
	ru: 'Не удалось отправить сообщение. Выключите блокировщик рекламы или попробуйте позже, а лучше напишите нам в Дискорде',
}[LANG]
export const I18N_YOUR_MESSAGE_HERE = { en: 'Your message here', ru: 'Текст сообщения' }[LANG]
export const I18N_REPORT_BUG_GUIDE = {
	en: () => (
		<>
			<p>
				Please describe your problem here. You can upload images on{' '}
				<a href="https://imgur.com/upload" target="_blank">
					imgur.com
				</a>{' '}
				and use generated links to them in your message.
			</p>
			<p>
				Or message us on{' '}
				<a href={LINK_DISCORD_INVITE} target="_blank">
					our Discord server
				</a>
				!
			</p>
		</>
	),
	ru: () => (
		<>
			<p>
				Пожалуйста, опишите проблему в поле ниже. Если требуется, вы можете загрузить скриншоты на
				сайт{' '}
				<a href="https://imgur.com/upload" target="_blank">
					imgur.com
				</a>{' '}
				и вставить ссылки на скриншоты в своё сообщение.
			</p>
			<p>
				Или напишите нам на{' '}
				<a href={LINK_DISCORD_INVITE} target="_blank">
					нaшем сервере в Дискорде
				</a>
				!
			</p>
		</>
	),
}[LANG]()
export const I18N_ERROR = { en: 'Error, reload page', ru: 'Ошибка, перезагрузите страницу' }[LANG]
export const I18N_PIECE_BONUS = {
	en: (n: number) => `${n} piece bonus`,
	ru: (n: number) => `Бонус ${n} части`,
}[LANG]
export const I18N_PIECES_BONUS = {
	en: (n: number) => `${n} pieces bonus`,
	ru: (n: number) => `Бонус ${n} частей`,
}[LANG]
export const I18N_BASE_ATTACK = { en: 'Base attack', ru: 'Базовая атака' }[LANG]
export const I18N_ITEM_STORY = { en: 'Item Story', ru: 'История предмета' }[LANG]
export const I18N_ON_MAP = { en: 'On map', ru: 'На карте' }[LANG]
export const I18N_SECONDARY_STAT = { en: 'Secondary Stat', ru: 'Пассивная способность' }[LANG]
type MapCodeName = Record<MapCode, string>
export const I18N_MAP_CODES_NAME: MapCodeName = {
	en: { teyvat: 'Teyvat', enkanomiya: 'Enkanomiya', chasm: 'The Chasm' },
	ru: { teyvat: 'Тейват', enkanomiya: 'Энканомия', chasm: 'Разлом' },
}[LANG]
export const I18N_CHAR_BUILD_RECS = {
	en: 'Character builds recommendations',
	ru: 'Рекомендуемые сборки персонажей',
}[LANG]
export const I18N_BEST_CHAR_BUILDS = {
	en: 'Best builds for Genshin characters',
	ru: 'Лучшие сборки персонажей Геншин Импакта',
}[LANG]
export const I18N_FOR_EXAMPLE = {
	en: 'For example' + ELLIPSIS,
	ru: 'Например' + ELLIPSIS,
}[LANG]
export const I18N_SELECT_CHAR_BELOW = { en: 'Select character below', ru: 'Выберите персонажа' }[LANG]
export const I18N_BUILD_RECS_FOR = { en: 'build recommendations', ru: 'билд' }[LANG]
export const I18N_RECOMMENDED_RU_ONLY = { en: '', ru: 'Рекомендуемый' }[LANG]
export const I18N_ABOUT_SITE = { en: 'Site History', ru: 'История сайта' }[LANG]
export const I18N_OUR_SOCIAL_NETWORKS = { en: 'Social', ru: 'Мы в соцсетях' }[LANG]
export const I18N_PAGE_WITH_ALL_LINKS = { en: 'Page with all links', ru: 'Страница со всеми ссылками' }[LANG]
export const I18N_WE_ARE_EVERYWHERE = { en: 'We are everywhere', ru: 'Мы везде' }[LANG]
export const I18N_CHATS = { en: 'Chats', ru: 'Чатики' }[LANG]
export const I18N_VIDEOS = { en: 'Videos', ru: 'Видосики' }[LANG]
// export const I18N_PICTURES = { en: 'Images', ru: 'Картиночки' }[LANG]
export const I18N_DONATE_US = { en: 'Donate', ru: 'Донатить здесь' }[LANG]
export const I18N_EQUIPMENT = { en: 'Equipment', ru: 'Снаряжение' }[LANG]
export const I18N_OUR_DISCORD = { en: 'Discord', ru: 'Дискорд' }[LANG]
const yt = { en: 'YouTube', ru: 'Ютуб' }[LANG]
export const I18N_YOUTUBE_RU = { en: yt + ' RU', ru: yt + ' на русском' }[LANG]
export const I18N_YOUTUBE_UA = { en: yt + ' UA', ru: yt + ' на украинском' }[LANG]
const tiktok = { en: 'TikTok', ru: 'ТикТок' }[LANG]
export const I18N_TIKTOK_RU = { en: tiktok + ' RU', ru: tiktok + ' на русском' }[LANG]
export const I18N_TIKTOK_UA = { en: tiktok + ' UA', ru: tiktok + ' на украинском' }[LANG]
const tg = { en: 'Telegram', ru: 'Телеграм' }[LANG]
export const I18N_OUR_TELEGRAM_RU = { en: tg + ' RU', ru: tg + ' на русском' }[LANG]
export const I18N_OUR_TELEGRAM_UA = { en: tg + ' UA', ru: tg + ' на украинском' }[LANG]
export const I18N_CHAR_EQUIPMENT = { en: 'Character Equipment', ru: 'Снаряжение персонажа' }[LANG]
export const I18N_CREATED_BY_US = {
	en: `Designed and coded by${NBSP}Yurtaikin${NBSP}Studio`,
	ru: `Задизайнено и запрограммировано студией${NBSP}Павла${NBSP}Юртайкина${NBSP}`,
}[LANG]
export const I18N_REPORT_BUG = {
	en: 'Report a bug',
	ru: 'Сообщить об ошибке',
}[LANG]
export const I18N_SUPPORT_US = {
	en: 'Support Us',
	ru: 'Поддержать нас',
}[LANG]
export const I18N_SUPPORT_VIA_KO_FI = {
	en: 'Ko-fi, if you have PayPal',
	ru: 'Ко-фи, если у вас есть Пейпал',
}[LANG]
export const I18N_SUPPORT_VIA_KO_FI_SHORT = {
	en: 'Ko-fi',
	ru: 'Ко-фи',
}[LANG]
export const I18N_SUPPORT_VIA_DON_ALERTS = {
	en: 'DonationAlerts',
	ru: 'Донейшн Алертс',
}[LANG]
export const I18N_ORDER_SITE_FROM_US = {
	en: 'Request a site from us',
	ru: 'Закажите у нас сайт',
}[LANG]
export const I18N_NOT_AFFILIATED_WITH_MIHOYO = {
	en: 'We are not affiliated with HoYoverse',
	ru: 'Мы не связаны с Хоёверс',
}[LANG]
export const I18N_C_MIHOYO = {
	en: 'Genshin Impact, items and characters illustrations are trademarks and copyrights of HoYoverse.',
	ru: 'Геншин Импакт, иллюстрации персонажей и предметов принадлежат Хоёверсу',
}[LANG]
export const I18N_HELPER_TEAM_TABLE = {
	en: 'Helper Team',
	ru: 'Хелпер Тим',
}[LANG]
export const I18N_HONEY_IMPACT = {
	en: 'Honey Impact',
	ru: 'Хани Импакт',
}[LANG]
export const I18N_GI_MAP = {
	en: 'Genshin Map',
	ru: 'Карта Геншина',
}[LANG]
export const I18N_GI_WIKI = {
	en: 'Genshin Wiki',
	ru: 'Вики Геншина',
}[LANG]
export const I18N_WE_USE_DATA_FROM = {
	en: 'We use data from',
	ru: 'Использованные источники',
}[LANG]
export const I18N_COPYRIGHTS = {
	en: 'Copyrights',
	ru: 'Авторские права',
}[LANG]
export const I18N_SEE_NOTES = {
	en: 'see notes',
	ru: 'см. заметки',
}[LANG]
export const I18N_UNSUPPORTED_LOCATION_WARNING = {
	en: "Looks like you've opened a cached/saved page. It won't work correctly that way :(",
	ru: 'Похоже, вы открыли сохранённую страницу. В таком виде она нормально работать не будет :(',
}[LANG]
export const I18N_NOTHING_TO_SHOW = {
	en: 'nothing to show',
	ru: 'нет результатов',
}[LANG]
export const I18N_MEGA_SEARCH_PLACEHOLDER = {
	en: 'Search for characters, weapons, artifacts',
	ru: 'Искать персонажей, артефакты, оружие',
}[LANG]

export const I18N_FRONT_PAGE_DESCRIPTION = {
	en: 'Up-to-date character builds recommendations, list of all weapons and artifacts in the game, dungeons schedule and other useful information about Genshin Impact',
	ru: 'Актуальные билды персонажей, список всего оружия и артефактов, что есть в игре, расписание подземелий и другая полезная информация о Геншин Импакте',
}[LANG]
export const I18N_BUILDS_PAGE_DESCRIPTION = {
	en: 'Genshin Impact builds recommendations for every character',
	ru: 'Рекомендуемые билды для персонажей Геншин Импакта',
}[LANG]
export const I18N_EQUIPMENT_PAGE_DESCRIPTION = {
	en: (code: 'weapons' | 'artifacts') => {
		return `List of Genshin Impact ${code} with full information and recommended characters`
	},
	ru: (code: 'weapons' | 'artifacts') => {
		const name = { artifacts: 'артефактов', weapons: 'оружия' }[code] ?? code
		return `Список ${name} Геншин Импакта с полной информацией и рекомендуемыми персонажами`
	},
}[LANG]
export function I18N_CHARACTER_PAGE_DESCRIPTION(
	characterName: string,
	roleName: string,
	weaponR5Name: string | null | undefined,
	weaponR4Name: string | null | undefined,
	artifactName: string | null | undefined,
	tipsText: string,
	notesText: string,
) {
	const weaponLabel = { en: 'Recommended weapon', ru: 'Рекомендуемое оружие' }[LANG]
	const artifactLabel = { en: 'Recommended artifact', ru: 'Рекомендуемые артефакты' }[LANG]

	// заметки не всегда заканчиваются точкой
	if (tipsText && !tipsText.trim().endsWith('.')) tipsText += '.'
	let extraText = tipsText + ' ' + notesText
	// ограничиваем длину по очередному пробелу
	if (extraText.length > 250) {
		const cutIndex = Math.min(...[' ', '.'].map(x => extraText.lastIndexOf(x, 230)))
		extraText = extraText.slice(0, cutIndex) + ELLIPSIS
	}

	return (
		`${characterName} ${DASH} ${roleName}.` +
		` ${weaponLabel}: ${[weaponR5Name, weaponR4Name].filter(x => x).join(', ')}.` +
		` ${artifactLabel}: ${artifactName ?? ''}.` +
		' ' +
		extraText
	)
}

type WeaponTypeNames = Record<GI_WeaponTypeCode, string>
const weaponTypeNamesRU: WeaponTypeNames = {
	claymore: 'Двуручный меч',
	sword: 'Меч',
	catalyst: 'Катализатор',
	polearm: 'Копье',
	bow: 'Лук',
}
export const I18N_WEAPON_TYPE_NAME = {
	en: (code: GI_WeaponTypeCode) => code,
	ru: (code: GI_WeaponTypeCode) => weaponTypeNamesRU[code],
}[LANG]

type WeaponObtainSourceNames = Record<GI_WeaponObtainSource | 'other', string>
const weaponObtainSourceNamesRU: WeaponObtainSourceNames = {
	wishes: 'молитвы',
	'event-wishes': 'молитвы события',
	events: 'события',
	'battle-pass': 'боевой пропуск',
	'in-game-shop': 'внутриигровой магазин',
	forging: 'ковка',
	fishing: 'рыболовля',
	'npc-shop': 'магазин НПС',
	chests: 'сундуки',
	quests: 'квесты',
	puzzles: 'паззл',
	investigation: 'исследование мира',
	'adventure-rank-10': '10 ранг приключений',
	playstation: 'плейстейшн',
	other: 'другое',
}
export const I18N_WEAPON_OBTAIN_SOURCE_NAME = {
	en: (code: GI_WeaponObtainSource | 'other') => code.replace(/-/g, ' ').replace(/\bnpc\b/, 'NPC'),
	ru: (code: GI_WeaponObtainSource | 'other') => weaponObtainSourceNamesRU[code],
}[LANG]
export const I18N_OBTAINED_DURING_STORYLINE = {
	en: 'Obtained during storyline quests',
	ru: 'Выдаётся во время прохождения сюжетных заданий',
}[LANG]
export const I18N_ART_GROUP_NAME: Record<GI_ArtifactGroupCode, string> = {
	'18%-atk': { en: 'ATK +18%', ru: 'Сила атаки +18%' }[LANG],
	'20%-er': { en: 'Energy Recharge +20%', ru: 'Восстановление энергии +20%' }[LANG],
	'25%-ph-atk': { en: 'Physical DMG +25%', ru: 'Физ. урон +25%' }[LANG],
	'80-em': { en: 'Elemental Mastery +80', ru: 'Мастерство Стихий +80' }[LANG],
	'15%-heal': { en: 'Healing Bonus +15%', ru: 'Бонус лечения +15%' }[LANG],
}
export const I18N_ITEM_DETAIL = {
	en: 'item detail',
	ru: 'страница предмета',
}[LANG]
export const I18N_ARROWS_TO_SELECT = {
	en: 'you can use Arrow keys and Enter to select option',
	ru: 'нужный результат можно быстро выбрать кнопками-стрелочками и Энтером',
}[LANG]
export const I18N_RECOMMENDED_BUILDS = {
	en: 'recomended builds',
	ru: 'билды персонажа',
}[LANG]
export const I18N_OBTAIN_SOURCES = {
	en: 'Obtain sources',
	ru: 'Способы получения',
}[LANG]
export const I18N_SORT_BY = {
	en: 'Sort by',
	ru: 'Сортировать по',
}[LANG]
export const I18N_WEAPON_TYPE = {
	en: 'Weapon type',
	ru: 'Тип оружия',
}[LANG]
export const I18N_NAME = {
	en: 'Name',
	ru: 'Название',
}[LANG]
export const I18N_SUBSTAT = {
	en: 'Substat',
	ru: 'Допстат',
}[LANG]
export const I18N_RARITY = {
	en: 'Rarity',
	ru: 'Редкость',
}[LANG]
export const I18N_WEAPON_TYPE_FILTER_TIP: Record<GI_WeaponTypeCode | 'everything', string> = {
	en: {
		everything: 'every type of weapon selected',
		sword: 'showing only swords',
		catalyst: 'showing only catalists',
		claymore: 'showing only claymores',
		polearm: 'showing only polearms',
		bow: 'showing only bows',
	},
	ru: {
		everything: 'выбраны все виды оружия',
		sword: 'выбраны только мечи',
		catalyst: 'выбраны только катализаторы',
		claymore: 'выбраны только двуручные мечи',
		polearm: 'выбраны только копья',
		bow: 'выбраны только луки',
	},
}[LANG]

const pluralizeHours = {
	en: (hours: number) => pluralizeEN(hours, 'hour', 'hours'),
	ru: (hours: number) => pluralizeRU(hours, 'час', 'часа', 'часов'),
}[LANG]
const pluralizeMinutes = {
	en: (minutes: number) => pluralizeEN(minutes, 'minute', 'minutes'),
	ru: (minutes: number) => pluralizeRU(minutes, 'минута', 'минуты', 'минут'),
}[LANG]
export function I18N_MS_TO_HM_WORDS(duration: number): string {
	const minutes = Math.floor((duration / (1000 * 60)) % 60)
	const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
	return `${hours} ${pluralizeHours(hours)} ${minutes} ${pluralizeMinutes(minutes)}`
}

function pluralizeEN(n: number, w0: string, w1: string): string {
	if (n < 0) n = -n
	const d0 = n % 10
	const d10 = n % 100

	if (d10 === 11 || d10 === 12 || d0 === 0 || (d0 >= 2 && d0 <= 9)) return w1
	return w0
}
function pluralizeRU(n: number, w0: string, w1: string, w3: string): string {
	if (n < 0) n = -n
	if (n % 10 === 1 && n % 100 !== 11) {
		return w0
	} else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
		return w1
	} else {
		return w3
	}
}
