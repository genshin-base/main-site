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

type Lang = 'en' | 'ru' | 'ua'
export const LANG = BUNDLE_ENV.LANG as Lang
export const I18N_LANG_NAMES: Record<Lang, string> = {
	en: 'English',
	ru: 'Русский',
	ua: 'Українська',
}
export const I18N_LANG_NAME = I18N_LANG_NAMES[LANG]
export const I18N_PAGE_TITLE_POSTFIX = { en: ` ${BULLET} Genshin Base`, ru: ` ${BULLET} Геншин База` }[LANG]
export const I18N_LOADING = { en: 'Loading', ru: 'Загрузка', ua: 'Завантаження' }[LANG]
export const I18N_COLLAPSE = { en: 'Collapse', ru: 'Свернуть', ua: 'Приховати' }[LANG]
export const I18N_DASHBOARD = { en: 'Dashboard', ru: 'Самое важное', ua: 'Наважливіше' }[LANG]
export const I18N_REGION = { en: 'Region', ru: 'Регион', ua: 'Регіон' }[LANG]
export const I18N_UNTIL_DAY_RESET = { en: 'Until Day Reset', ru: 'До нового дня', ua: 'До нового дня' }[LANG]
export const I18N_ALCHEMY_CALC = {
	en: 'Alchemy Calculator',
	ru: 'Калькулятор алхимии',
	ua: 'Алхімічний калькулятор',
}[LANG]
export const I18N_WHAT_TO_FARM = { en: 'What to Farm', ru: 'Что фармить', ua: 'Що фармити' }[LANG]
export const I18N_BUILDS = { en: 'Builds', ru: 'Сборки персонажей', ua: 'Збірки персонажів' }[LANG]
export const I18N_ASIA = { en: 'Asia', ru: 'Азия', ua: 'Азія' }[LANG]
export const I18N_NORH_AMERICA = { en: 'North America', ru: 'Северная Америка', ua: 'Північна Америка' }[LANG]
export const I18N_EUROPE = { en: 'Europe', ru: 'Европа', ua: 'Європа' }[LANG]
export const I18N_MINUTE = { en: 'minute', ru: 'минута', ua: 'хвилина' }[LANG]
export const I18N_MINUTES = { en: 'minutes', ru: 'минуты', ua: 'хвилини' }[LANG]
export const I18N_MINUTES_3 = { en: 'minutes', ru: 'минут', ua: 'хвилин' }[LANG]
export const I18N_TODAY = { en: 'today', ru: 'сегодня', ua: 'сьогодні' }[LANG]
export const I18N_WEEKDAYS = {
	en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
	ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
	ua: ['Понеділок', 'Вівторок', 'Середа', 'Четвер', "П'ятниця", 'Субота', 'Неділя'],
}[LANG]
export const I18N_TOMORROW = { en: 'tomorrow', ru: 'завтра', ua: 'завтра' }[LANG]
export const I18N_DUNGEONS = { en: 'Dungeons', ru: 'Подземелья', ua: 'Підземелля' }[LANG]
export const I18N_TALENTS = { en: 'Talents', ru: 'Таланты', ua: 'Таланти' }[LANG]
export const I18N_WEAPONS = { en: 'Weapons', ru: 'Оружие', ua: 'Зброя' }[LANG]
export const I18N_MAIN_INFO = { en: 'main info', ru: 'основная информация', ua: 'основна інформація' }[LANG]
export const I18N_WEAPON_STACKS_COUNT = {
	en: (stacks: number) => stacks + ' ' + pluralizeEN(stacks, 'stack', 'stacks'),
	ru: (stacks: number) => stacks + ' ' + pluralizeRU(stacks, 'стак', 'стака', 'стаков'),
	ua: (stacks: number) => stacks + ' ' + pluralizeRU(stacks, 'стак', 'стаки', 'стаків'),
}[LANG]
export const I18N_WEAPON_REFINE = {
	en: (refine: string) => 'R' + refine,
	ru: (refine: string) => 'Р' + refine,
	ua: (refine: string) => 'Р' + refine,
}[LANG]
export const I18N_WHY_ADD_TO_FAVS_TIP = {
	en: 'Add characters or items to your favorites to see them marked here.',
	ru: 'Добавьте персонажей и предметы в избранные, чтобы выделить их здесь',
	ua: 'Додайте персонажів і предмети до вибраних, щоб виділити їх тут',
}[LANG]
export const I18N_FAV_CHARACTERS = {
	en: 'Favorite characters',
	ru: 'Избранные персонажи',
	ua: 'Вибрані персонажі',
}[LANG]

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
	ua: (() => {
		const add = (s: string) => `Додати ${s} до вибраного`
		const remove = (s: string) => `Видалити ${s} з вибраного`
		return {
			add: { weapon: add('зброю'), character: add('персонажа'), material: add('матеріял') },
			remove: {
				weapon: remove('зброю'),
				character: remove('персонажа'),
				material: remove('матеріял'),
			},
		}
	})(),
}[LANG]
export const I18N_CHOOSE_FROM_FAV = {
	en: 'Choose from favorite',
	ru: 'Выберите из избранных',
	ua: 'Оберіть із вибраних',
}[LANG]
export const I18N_ARTIFACTS = { en: 'Artifacts', ru: 'Артефакты', ua: 'Артефакти' }[LANG]
export const I18N_CHARACTERS = { en: 'Characters', ru: 'Персонажи', ua: 'Персонажі' }[LANG]
export const I18N_ART_STATS_PRIORITY = {
	en: 'Artifact stats priority',
	ru: 'Приоритетные главстаты',
	ua: 'Пріоритетні стати',
}[LANG]
export const I18N_SUBSTATS_PRIORITY = {
	en: 'Substats priority',
	ru: 'Приоритетные допстаты',
	ua: 'Пріоритетні підстати',
}[LANG]
export const I18N_TALENTS_PRIORITY = {
	en: 'Talents Priority',
	ru: 'Приоритетные таланты',
	ua: 'Приоритетні таланти',
}[LANG]
export const I18N_ASC_MATERIALS = {
	en: 'Ascension materials',
	ru: 'Материалы возвышения',
	ua: 'Матеріали піднесення',
}[LANG]
export const I18N_FULL_BUILD_INFO = {
	en: 'Full build info',
	ru: 'Полная информация о билде',
	ua: 'Повна інформація про білд',
}[LANG]
export const I18N_CHAR_LORE = { en: 'Character lore', ru: 'Лор персонажа', ua: 'Лор персонажа' }[LANG]
export const I18N_MORE_ON_BUILDS_PAGE = {
	en: 'more on build page',
	ru: 'продолжение на странице билда',
	ua: 'продовження на сторінці білда',
}[LANG]
export const I18N_BACK = { en: 'Back', ru: 'Назад', ua: 'Назад' }[LANG]
export const I18N_NOTES = { en: 'Notes', ru: 'Примечания', ua: 'Примітки' }[LANG]

const artTypeNamesRU: Record<GI_ArtifactTypeCode, string> = {
	flower: 'цветок',
	plume: 'перо',
	sands: 'часы',
	goblet: 'кубок',
	circlet: 'корона',
}
const artTypeNamesUA: Record<GI_ArtifactTypeCode, string> = {
	flower: 'квітка',
	plume: 'перо',
	sands: 'годинник',
	goblet: 'кубок',
	circlet: 'корона',
}
export const I18N_ART_TYPE = {
	en: (code: GI_ArtifactTypeCode) => code as string,
	ru: (code: GI_ArtifactTypeCode) => artTypeNamesRU[code],
	ua: (code: GI_ArtifactTypeCode) => artTypeNamesUA[code],
}[LANG]

const statNamesRU: Record<GI_KnownStatBonusCode, string> = {
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
	'crit-rate': 'Шанс крит. попадания',
	'crit-rate%': '% Шанса крит. попадания',
	'crit-dmg': 'Крит. урон',
	'crit-dmg%': '% Крит. урона',
	'phys-dmg': 'Физ. урон',
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
const statNamesUA: Record<GI_KnownStatBonusCode, string> = {
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
	'crit-rate': 'Шанс крит. попадания',
	'crit-rate%': '% Шанса крит. попадания',
	'crit-dmg': 'Крит. урон',
	'crit-dmg%': '% Крит. урона',
	'phys-dmg': 'Физ. урон',
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
	ru: (code: string) => statNamesRU[code] ?? code,
	ua: (code: string) => statNamesUA[code] ?? code,
}[LANG]

type TalentTypeNames = Record<GI_TalentCode, string>
const talentTypesNamesRU: TalentTypeNames = {
	attack: 'обычная атака',
	skill: 'элементальный навык',
	burst: 'взрыв стихии',
}
const talentTypesNamesUA: TalentTypeNames = {
	attack: 'звичайна атака',
	skill: 'элементальна навичка',
	burst: 'вибух стихії',
}
export const I18N_TALENT_NAME = {
	en: (code: GI_TalentCode) => code,
	ru: (code: GI_TalentCode) => talentTypesNamesRU[code],
	ua: (code: GI_TalentCode) => talentTypesNamesUA[code],
}[LANG]

type ConjuctionType = 'or' | 'and'
export const I18N_CONJUCTIONS: Record<ConjuctionType, string> = {
	en: { or: 'or', and: 'and' },
	ru: { or: 'или', and: 'и' },
	ua: { or: 'або', and: 'і' },
}[LANG]

export const I18N_RECOMMENDED_FOR = {
	en: 'Recommended for',
	ru: 'Рекомендуется для',
	ua: 'Рекомендовано для',
}[LANG]
export const I18N_FOR_NOBODY = { en: 'Nobody', ru: 'Никого', ua: 'Нікого' }[LANG]
export const I18N_SOURCE = { en: 'Source', ru: 'Источник', ua: 'Джерело' }[LANG]
export const I18N_SCROLL_TO_ZOOM = { en: 'Scroll to zoom', ru: 'Зум колёсиком', ua: 'Зум колесиком' }[LANG]
export const I18N_PINCH_TO_ZOOM = { en: 'Pinch to zoom', ru: 'Зум щипком', ua: 'Зум щипком' }[LANG]
export const I18N_CANCEL = { en: 'cancel', ru: 'отмена', ua: 'відміна' }[LANG]
export const I18N_SUBMIT = { en: 'submit', ru: 'отправить', ua: 'надіслати' }[LANG]
export const I18N_SUBMIT_BUG_SUCCESS = {
	en: 'Message sent. Thank you',
	ru: 'Сообщение отправлено. Спасибо',
	ua: 'Повідомлення надіслане. Дякую',
}[LANG]
export const I18N_SUBMIT_BUG_ERROR = {
	en: 'Error happened while sending message. Please disable adblock or try again later, or contact us on Discord',
	ru: 'Не удалось отправить сообщение. Выключите блокировщик рекламы или попробуйте позже, а лучше напишите нам в Дискорде',
	ua: 'Не вдалось відправити повідомлення. Вимкніть блокувальник реклами або спробуйте пізніше, а краще напишіть нам в Діскорді',
}[LANG]
export const I18N_YOUR_MESSAGE_HERE = {
	en: 'Your message here',
	ru: 'Текст сообщения',
	ua: 'Текст повідомлення',
}[LANG]
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
	ua: () => (
		<>
			<p>
				Будь ласка, опишіть проблему в поле нижче. Якщо потрібно, ви можете завантажити скріншоти на
				сайт{' '}
				<a href="https://imgur.com/upload" target="_blank">
					imgur.com
				</a>{' '}
				і вставити посилання на скріншоти в своє повідомлення.
			</p>
			<p>
				Або напишіть нам на{' '}
				<a href={LINK_DISCORD_INVITE} target="_blank">
					нaшому сервері в Діскорді
				</a>
				!
			</p>
		</>
	),
}[LANG]()
export const I18N_ERROR = {
	en: 'Error, reload page',
	ru: 'Ошибка, перезагрузите страницу',
	ua: 'Помилка, перезавантажте сторінку',
}[LANG]
export const I18N_PIECE_BONUS = {
	en: (n: number) => `${n} piece bonus`,
	ru: (n: number) => `Бонус ${n} части`,
	ua: (n: number) => `Бонус ${n} частини`,
}[LANG]
export const I18N_PIECES_BONUS = {
	en: (n: number) => `${n} pieces bonus`,
	ru: (n: number) => `Бонус ${n} частей`,
	ua: (n: number) => `Бонус ${n} частин`,
}[LANG]
export const I18N_BASE_ATTACK = { en: 'Base attack', ru: 'Базовая атака', ua: 'Базова атака' }[LANG]
export const I18N_ITEM_STORY = { en: 'Item Story', ru: 'История предмета', ua: 'Історія предмета' }[LANG]
export const I18N_ON_MAP = { en: 'On map', ru: 'На карте', ua: 'Базова атака' }[LANG]
export const I18N_SECONDARY_STAT = {
	en: 'Secondary Stat',
	ru: 'Пассивная способность',
	ua: 'Пасивна здібність',
}[LANG]
type MapCodeName = Record<MapCode, string>
export const I18N_MAP_CODES_NAME: MapCodeName = {
	en: { teyvat: 'Teyvat', enkanomiya: 'Enkanomiya', chasm: 'The Chasm' },
	ru: { teyvat: 'Тейват', enkanomiya: 'Энканомия', chasm: 'Разлом' },
	ua: { teyvat: 'Тейват', enkanomiya: 'Енканомія', chasm: 'Розлом' },
}[LANG]
export const I18N_CHAR_BUILD_RECS = {
	en: 'Character builds recommendations',
	ru: 'Рекомендуемые сборки персонажей',
	ua: 'Рекомендовані збірки персонажів',
}[LANG]
export const I18N_SELECT_CHAR_BELOW = {
	en: 'Select character below',
	ru: 'Выберите персонажа',
	ua: 'Виберіть персонажа',
}[LANG]
export const I18N_BUILD_RECS_FOR = { en: 'build recommendations', ru: 'билд', ua: 'білд' }[LANG]
export const I18N_RECOMMENDED_RU_ONLY = { en: '', ru: 'Рекомендуемый', ua: 'Рекомендований' }[LANG]
export const I18N_ABOUT_SITE = { en: 'Site History', ru: 'История сайта', ua: 'Історія сайту' }[LANG]
export const I18N_EQUIPMENT = { en: 'Equipment', ru: 'Снаряжение', ua: 'Екіпірування' }[LANG]
export const I18N_CHAR_EQUIPMENT = {
	en: 'Character Equipment',
	ru: 'Снаряжение персонажа',
	ua: 'Екіпірування персонажа',
}[LANG]
export const I18N_OUR_DISCORD = { en: 'Our Discord', ru: 'Наш Дискорд', ua: 'Наш Діскорд' }[LANG]
export const I18N_CREATED_BY_US = {
	en: `Designed and coded by${NBSP}Yurtaikin${NBSP}Studio`,
	ru: `Задизайнено и запрограммировано студией${NBSP}Павла${NBSP}Юртайкина${NBSP}`,
	ua: `Задизайнено й запрограмовано студією${NBSP}Павла${NBSP}Юртайкіна${NBSP}`,
}[LANG]
export const I18N_REPORT_BUG = {
	en: 'Report a bug',
	ru: 'Сообщить об ошибке',
	ua: 'Повідомити про помилку',
}[LANG]
export const I18N_SUPPORT_US = {
	en: 'Support Us',
	ru: 'Поддержать нас',
	ua: 'Підтримати нас',
}[LANG]
export const I18N_SUPPORT_VIA_KO_FI = {
	en: 'Ko-fi, if you have PayPal',
	ru: 'Ко-фи, если у вас есть Пейпал',
	ua: 'Ко-фі, якщо у вас є Пейпал',
}[LANG]
export const I18N_SUPPORT_VIA_DON_ALERTS = {
	en: 'DonationAlerts',
	ru: 'Донейшн Алертс',
	ua: 'Донейшн Альортс',
}[LANG]
export const I18N_ORDER_SITE_FROM_US = {
	en: 'Request a site from us',
	ru: 'Закажите у нас сайт',
	ua: 'Замовте в нас сайт',
}[LANG]
export const I18N_NOT_AFFILIATED_WITH_MIHOYO = {
	en: 'We are not affiliated with HoYoverse',
	ru: 'Мы не связаны с Хоёверс',
	ua: "Ми не пов'язані з Хойоверс",
}[LANG]
export const I18N_C_MIHOYO = {
	en: 'Genshin Impact, items and characters illustrations are trademarks and copyrights of HoYoverse.',
	ru: 'Геншин Импакт, иллюстрации персонажей и предметов принадлежат Хоёверсу',
	ua: 'Геншин Імпакт, ілюстрації персонажів і предметів належать Гойоверсові',
}[LANG]
export const I18N_HELPER_TEAM_TABLE = {
	en: 'Helper Team',
	ru: 'Хелпер Тим',
	ua: 'Хелпер Тім',
}[LANG]
export const I18N_HONEY_IMPACT = {
	en: 'Honey Impact',
	ru: 'Хани Импакт',
	ua: 'Хані Імпакт',
}[LANG]
export const I18N_GI_MAP = {
	en: 'Genshin Map',
	ru: 'Карта Геншина',
	ua: 'Мапа Геншина',
}[LANG]
export const I18N_GI_WIKI = {
	en: 'Genshin Wiki',
	ru: 'Вики Геншина',
	ua: 'Вікі Геншину',
}[LANG]
export const I18N_WE_USE_DATA_FROM = {
	en: 'We use data from',
	ru: 'Использованные источники',
	ua: 'Використані джерела',
}[LANG]
export const I18N_COPYRIGHTS = {
	en: 'Copyrights',
	ru: 'Авторские права',
	ua: 'Авторські права',
}[LANG]
export const I18N_SEE_NOTES = {
	en: 'see notes',
	ru: 'см. заметки',
	ua: 'див. нотатки',
}[LANG]
export const I18N_UNSUPPORTED_LOCATION_WARNING = {
	en: "Looks like you've opened a cached/saved page. It won't work correctly that way :(",
	ru: 'Похоже, вы открыли сохранённую страницу. В таком виде она нормально работать не будет :(',
	ua: 'Схоже, ви відкрили збережену сторінку. В такому вигляді вона нормально працювати не буде :(',
}[LANG]
export const I18N_NOTHING_TO_SHOW = {
	en: 'nothing to show',
	ru: 'нет результатов',
	ua: 'немає результатів',
}[LANG]
export const I18N_MEGA_SEARCH_PLACEHOLDER = {
	en: 'Search for characters, weapons, artifacts',
	ru: 'Искать персонажей, артефакты, оружие',
	ua: 'Шукати персонажів, артефакти, зброю',
}[LANG]

export const I18N_FRONT_PAGE_DESCRIPTION = {
	en: 'Up-to-date character builds recommendations, list of all weapons and artifacts in the game, dungeons schedule and other useful information about Genshin Impact',
	ru: 'Актуальные билды персонажей, список всего оружия и артефактов, что есть в игре, расписание подземелий и другая полезная информация о Геншин Импакте',
	ua: 'Актуальні білди персонажів, список всієї зброї і артефактів, що є в грі, розклад підземель та інша корисна інформація про Геншин Импакт',
}[LANG]
export const I18N_BUILDS_PAGE_DESCRIPTION = {
	en: 'Genshin Impact builds recommendations for every character',
	ru: 'Рекомендуемые билды для персонажей Геншин Импакта',
	ua: 'Рекомендовані білди для персонажів Геншин Імпакту',
}[LANG]
export const I18N_EQUIPMENT_PAGE_DESCRIPTION = {
	en: (code: 'weapons' | 'artifacts') => {
		return `List of Genshin Impact ${code} with full information and recommended characters`
	},
	ru: (code: 'weapons' | 'artifacts') => {
		const name = { artifacts: 'артефактов', weapons: 'оружия' }[code] ?? code
		return `Список ${name} Геншин Импакта с полной информацией и рекомендуемыми персонажами`
	},
	ua: (code: 'weapons' | 'artifacts') => {
		const name = { artifacts: 'артефактів', weapons: 'зброї' }[code] ?? code
		return `Список ${name} Геншин Імпакту з повною інформацією й рекомендованими персонажами`
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
	const weaponLabel = { en: 'Recommended weapon', ru: 'Рекомендуемое оружие', ua: 'Рекомендована зброя' }[
		LANG
	]
	const artifactLabel = {
		en: 'Recommended artifact',
		ru: 'Рекомендуемые артефакты',
		ua: 'Рекомендовані артефакти',
	}[LANG]

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
const weaponTypeNamesUA: WeaponTypeNames = {
	claymore: 'Дворучний меч',
	sword: 'Меч',
	catalyst: 'Каталізатор',
	polearm: 'Спис',
	bow: 'Лук',
}
export const I18N_WEAPON_TYPE_NAME = {
	en: (code: GI_WeaponTypeCode) => code,
	ru: (code: GI_WeaponTypeCode) => weaponTypeNamesRU[code],
	ua: (code: GI_WeaponTypeCode) => weaponTypeNamesUA[code],
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
	puzzles: 'паззлы',
	investigation: 'исследование мира',
	'adventure-rank-10': '10 ранг приключений',
	playstation: 'плейстейшн',
	other: 'другое',
}
const weaponObtainSourceNamesUA: WeaponObtainSourceNames = {
	wishes: 'молитви',
	'event-wishes': 'молитви події',
	events: 'події',
	'battle-pass': 'бойова перепустка',
	'in-game-shop': 'ігровий магазин',
	forging: 'кування',
	fishing: 'риболовля',
	'npc-shop': 'магазин НПС',
	chests: 'скрині',
	quests: 'завдання',
	puzzles: 'пазли',
	investigation: 'дослідження світу',
	'adventure-rank-10': '10 ранг пригод',
	playstation: 'плейстейшн',
	other: 'інше',
}
export const I18N_WEAPON_OBTAIN_SOURCE_NAME = {
	en: (code: GI_WeaponObtainSource | 'other') => code.replace(/-/g, ' ').replace(/\bnpc\b/, 'NPC'),
	ru: (code: GI_WeaponObtainSource | 'other') => weaponObtainSourceNamesRU[code],
	ua: (code: GI_WeaponObtainSource | 'other') => weaponObtainSourceNamesUA[code],
}[LANG]
export const I18N_OBTAINED_DURING_STORYLINE = {
	en: 'Obtained during storyline quests',
	ru: 'Выдаётся во время прохождения сюжетных заданий',
	ua: 'Видається під час проходження сюжетних завдань',
}[LANG]
export const I18N_ART_GROUP_NAME: Record<GI_ArtifactGroupCode, string> = {
	'18%-atk': { en: 'ATK +18%', ru: 'Сила атаки +18%', ua: 'Сила атаки +18%' }[LANG],
	'20%-er': {
		en: 'Energy Recharge +20%',
		ru: 'Восстановление энергии +20%',
		ua: 'Відновлення енергії +20%',
	}[LANG],
	'25%-ph-atk': { en: 'Physical DMG +25%', ru: 'Физ. урон +25%', ua: 'Фіз. ушкодження +25%' }[LANG],
	'80-em': { en: 'Elemental Mastery +80', ru: 'Мастерство стихий +80', ua: 'Майстерність стихій +80' }[
		LANG
	],
	'15%-heal': { en: 'Healing Bonus +15%', ru: 'Бонус лечения +15%', ua: 'Бонус лікування +15%' }[LANG],
}
export const I18N_ITEM_DETAIL = {
	en: 'item detail',
	ru: 'страница предмета',
	ua: 'сторінка предмета',
}[LANG]
export const I18N_ARROWS_TO_SELECT = {
	en: 'you can use Arrow keys and Enter to select option',
	ru: 'нужный результат можно быстро выбрать кнопками-стрелочками и Энтером',
	ua: 'потрібний результат можна швидко вибрати кнопками-стрілочками й Ентером',
}[LANG]
export const I18N_RECOMMENDED_BUILDS = {
	en: 'recomended builds',
	ru: 'билды персонажа',
	ua: 'білди персонажа',
}[LANG]
export const I18N_OBTAIN_SOURCES = {
	en: 'Obtain sources',
	ru: 'Способы получения',
	ua: 'Способи отримання',
}[LANG]
export const I18N_SORT_BY = {
	en: 'Sort by',
	ru: 'Сортировать по',
	ua: 'Сортувати за',
}[LANG]
export const I18N_WEAPON_TYPE = {
	en: 'Weapon type',
	ru: 'Тип оружия',
	ua: 'Тип зброї',
}[LANG]
export const I18N_NAME = {
	en: 'Name',
	ru: 'Название',
	ua: 'Назва',
}[LANG]
export const I18N_SUBSTAT = {
	en: 'Substat',
	ru: 'Допстат',
	ua: 'Підстат',
}[LANG]
export const I18N_RARITY = {
	en: 'Rarity',
	ru: 'Редкость',
	ua: 'Рідкість',
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
	ua: {
		everything: 'вибрані всі види зброї',
		sword: 'вибрані тільки мечі',
		catalyst: 'вибраны тільки каталізатори',
		claymore: 'вибрані тільки дворучні мечі',
		polearm: 'вибрані тільки списи',
		bow: 'вибрані тільки луки',
	},
}[LANG]

const pluralizeHours = {
	en: (hours: number) => pluralizeEN(hours, 'hour', 'hours'),
	ru: (hours: number) => pluralizeRU(hours, 'час', 'часа', 'часов'),
	ua: (hours: number) => pluralizeRU(hours, 'година', 'години', 'годин'),
}[LANG]
const pluralizeMinutes = {
	en: (minutes: number) => pluralizeEN(minutes, 'minute', 'minutes'),
	ru: (minutes: number) => pluralizeRU(minutes, 'минута', 'минуты', 'минут'),
	ua: (minutes: number) => pluralizeRU(minutes, 'хвилина', 'хвилини', 'хвилин'),
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
