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

type Lang = 'en' | 'ru'
export const LANG = BUNDLE_ENV.LANG as Lang
export const I18N_LANG_NAMES: Record<Lang, string> = {
	en: 'English',
	ru: 'Русский',
}
export const I18N_LANG_NAME = I18N_LANG_NAMES[LANG]
const titlePostfix = ' — Genshin Base'
export const I18N_PAGE_TITLE_POSTFIX = { en: titlePostfix, ru: titlePostfix }[LANG]
export const I18N_LOADING = { en: 'Loading', ru: 'Загрузка' }[LANG]
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
	ru: 'Добавьте персонажей и предметы в избранные, чтобы отметить их здесь',
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
	atk: 'атака',
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
	'phys-dmg%': '% физ. урона',
	'cryo-dmg%': '% Крио урона',
	'geo-dmg%': '% Гео урона',
	'anemo-dmg%': '% Анемо урона',
	'hydro-dmg%': '% Гидро урона',
	'electro-dmg%': '% Электро урона',
	'pyro-dmg%': '% Пиро урона',
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

export const I18N_RECOMENDED_FOR = { en: 'Recommended for', ru: 'Рекомендуется для' }[LANG]
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
	en: 'Error happened while sending message. Please try again later, or contact us on Discord',
	ru: 'Не удалось отправить сообщение. Попробуйте позже, или напишите нам в Дискорде',
}[LANG]
export const I18N_YOUR_MESSAGE_HERE = { en: 'Your message here', ru: 'Текст сообщения' }[LANG]
export const I18N_REPORT_BUG_GUIDE = {
	en: (
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
	ru: (
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
}[LANG]
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
export const I18N_SECONDARY_STAT = { en: 'Secondary Stat', ru: 'Пассивная способность' }[LANG]
type MapCodeName = Record<MapCode, string>
export const I18N_MAP_CODES_NAME: MapCodeName = {
	en: { teyvat: 'Teyvat', enkanomiya: 'Enkanomiya' },
	ru: { teyvat: 'Тейват', enkanomiya: 'Энканомия' },
}[LANG]
export const I18N_CHAR_BUILD_RECS = {
	en: 'Character builds recomendations',
	ru: 'Рекомендуемые сборки персонажей',
}[LANG]
export const I18N_SELECT_CHAR_ABOVE = { en: 'Select character above', ru: 'Выберите персонажа' }[LANG]
export const I18N_BUILD_RECS_FOR = { en: 'build recomendations', ru: 'билд' }[LANG]
export const I18N_RECOMENDED = { en: 'Recomended', ru: 'Рекомендуемый' }[LANG]
export const I18N_BASED_ON_GIHT = {
	en: "Based on Genshin Impact Helper Team's Character Builds",
	ru: 'Основано на табличке Геншин Импакт Хелпер Тимы (англ.)',
}[LANG]
export const I18N_ABOUT_SITE = { en: 'Site History', ru: 'История сайта' }[LANG]
export const I18N_OUR_DISCORD = { en: 'Our Discord', ru: 'Наш Дискорд' }[LANG]
export const I18N_CREATED_BY_US = {
	en: 'Designed and coded by Absolute Evil Studio',
	ru: 'Задизайнено и закожено в Абсолют Ивел студии',
}[LANG]
export const I18N_REPORT_BUG = {
	en: 'Report a bug',
	ru: 'Сообщить об ошибке',
}[LANG]
export const I18N_SUPPORT_US = {
	en: 'Support Us',
	ru: 'Поддержать нас',
}[LANG]
export const I18N_ORDER_SITE_FROM_US = {
	en: 'Request a site from us',
	ru: 'Закажите у нас сайт',
}[LANG]

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

type WeaponObtainSourceNames = Record<GI_WeaponObtainSource, string>
const weaponObtainSourceNamesRU: WeaponObtainSourceNames = {
	wishes: 'молитвы',
	'event-wishes': 'молитвы события',
	events: 'события',
	'battle-pass': 'батл-пасс',
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
}
export const I18N_WEAPON_OBTAIN_SOURCE_NAME = {
	en: (code: GI_WeaponObtainSource) => code.replace(/-/g, ' ').replace(/\bnpc\b/, 'NPC'),
	ru: (code: GI_WeaponObtainSource) => weaponObtainSourceNamesRU[code],
}[LANG]
export const I18N_OBTAINED_DURING_STORYLINE = {
	en: 'Obtained during storyline quests',
	ru: 'Выдаётся во время прохождения сюжетных заданий',
}[LANG]
export const I18N_ART_GROUP_NAME: Record<GI_ArtifactGroupCode, string> = {
	en: { '18%-atk': 'ATK +18%', '20%-er': 'Energy Recharge +20%' },
	ru: { '18%-atk': 'Сила атаки +18%', '20%-er': 'Восстановление энергии +20%' },
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
