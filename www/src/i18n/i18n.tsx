import {
	GI_ArtifactTypeCode,
	GI_WeaponObtainSource,
	GI_WeaponTypeCode,
	MapCode,
} from '#src/../../lib/genshin'
import { GI_TalentCode } from '#src/../../lib/parsing/helperteam/types'
import { artifactTypes } from '#src/utils/artifacts'

type Lang = 'en' | 'ru'
const LANG = BUNDLE_ENV.LANG as Lang
const l = (en, ru) => {
	return {
		en,
		ru,
	}
}
export const I18N_LANG_NAMES: Record<Lang, string> = {
	en: 'English',
	ru: 'Русский',
}
export const I18N_LANG_NAME = I18N_LANG_NAMES[LANG]

export const I18N_DASHBOARD = l('Dashboard', 'Самое важное')[LANG]
export const I18N_REGION = l('Region', 'Регион')[LANG]
export const I18N_UNTIL_DAY_RESET = l('Until Day Reset', 'До нового дня')[LANG]
export const I18N_ALCHEMY_CALC = l('Alchemy Calculator', 'Калькулятор алхимии')[LANG]
export const I18N_WHAT_TO_FARM = l('What to Farm', 'Что фармить')[LANG]
export const I18N_BUILDS = l('Builds', 'Сборки персонажей')[LANG]
export const I18N_ASIA = l('Asia', 'Азия')[LANG]
export const I18N_NORH_AMERICA = l('North America', 'Северная Америка')[LANG]
export const I18N_EUROPE = l('Europe', 'Европа')[LANG]
export const I18N_MINUTE = l('minute', 'минута')[LANG]
export const I18N_MINUTES = l('minutes', 'минуты')[LANG]
export const I18N_MINUTES_3 = l('minutes', 'минут')[LANG]
export const I18N_HOUR = l('hour', 'час')[LANG]
export const I18N_HOURS = l('hours', 'часа')[LANG]
export const I18N_HOURS_3 = l('hours', 'часов')[LANG]
export const I18N_TODAY = l('today', 'сегодня')[LANG]
export const I18N_WEEKDAYS = l(
	['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
	['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
)[LANG]
export const I18N_TOMORROW = l('tomorrow', 'завтра')[LANG]
export const I18N_DUNGEONS = l('Dungeons', 'Подземелья')[LANG]
export const I18N_TALENTS = l('Talents', 'Таланты')[LANG]
export const I18N_WEAPONS = l('Weapons', 'Оружие')[LANG]
export const I18N_WHY_ADD_TO_FAVS_TIP = l(
	'Add characters, weapons or items to your favorites to see them marked here.',
	'Добавьте персонажей, оружие и предметы в избранные, чтобы отметить их здесь',
)[LANG]
export const I18N_FAV_CHARACTERS = l('Favorite characters', 'Избранные персонажи')[LANG]
export const I18N_ARTIFACTS = l('Artifacts', 'Артефакты')[LANG]
export const I18N_ART_STATS_PRIORITY = l('Artifact stats priority', 'Приоритетные главстаты')[LANG]
export const I18N_SUBSTATS_PRIORITY = l('Substats priority', 'Приоритетные сабстаты')[LANG]
export const I18N_TALENTS_PRIORITY = l('Talents Priority', 'Приоритетные умения')[LANG]
export const I18N_ASC_MATERIALS = l('Ascension materials', 'Материалы возвышения')[LANG]
export const I18N_FULL_BUILD_INFO = l('Full build info', 'Полная информация о билде')[LANG]
export const I18N_CHAR_LORE = l('Character lore', 'Лор персонажа')[LANG]
export const I18N_MORE_ON_BUILDS_PAGE = l('more on build page', 'продолжение на странице билда')[LANG]
export const I18N_BACK = l('Back', 'Назад')[LANG]
export const I18N_NOTES = l('Notes', 'Примечания')[LANG]

const artTypes = artifactTypes.map(t => t.code)
type ArtTypeNames = Record<GI_ArtifactTypeCode, string>
const artTypeNamesEN: ArtTypeNames = artTypes.reduce((p, c) => {
	p[c] = c
	return p
}, {} as ArtTypeNames)
const artTypeNamesRU: ArtTypeNames = {
	flower: 'цветок',
	plume: 'перо',
	sands: 'часы',
	goblet: 'кубок',
	circlet: 'корона',
}
export const I18N_ART_TYPES: ArtTypeNames = l(artTypeNamesEN, artTypeNamesRU)[LANG]

//todo нормальный тип
type GI_StatCode =
	| 'def'
	| 'def%'
	| 'dmg'
	| 'dmg%'
	| 'atk'
	| 'atk%'
	| 'hp'
	| 'hp%'
	| 'em'
	| 'er'
	| 'er%'
	| 'healing'
	| 'healing%'
	| 'crit-rate'
	| 'crit-rate%'
	| 'crit-dmg'
	| 'crit-dmg%'
	| 'phys-dmg'
	| 'cryo-dmg'
	| 'geo-dmg'
	| 'anemo-dmg'
	| 'hydro-dmg'
	| 'electro-dmg'
	| 'pyro-dmg'
	| 'phys-dmg%'
	| 'cryo-dmg%'
	| 'geo-dmg%'
	| 'anemo-dmg%'
	| 'hydro-dmg%'
	| 'electro-dmg%'
	| 'pyro-dmg%'
const statCodes: GI_StatCode[] = [
	'def',
	'def%',
	'dmg',
	'dmg%',
	'atk',
	'atk%',
	'hp',
	'hp%',
	'em',
	'er',
	'er%',
	'healing',
	'healing%',
	'crit-rate',
	'crit-rate%',
	'crit-dmg',
	'crit-dmg%',
	'phys-dmg',
	'cryo-dmg',
	'geo-dmg',
	'anemo-dmg',
	'hydro-dmg',
	'electro-dmg',
	'pyro-dmg',
	'phys-dmg%',
	'cryo-dmg%',
	'geo-dmg%',
	'anemo-dmg%',
	'hydro-dmg%',
	'electro-dmg%',
	'pyro-dmg%',
]
type StatNames = Record<GI_StatCode, string>
const statNamesEN: StatNames = statCodes.reduce((p, c) => {
	p[c] = c.replace(/-/g, ' ')
	return p
}, {} as StatNames)
const statNamesRu: StatNames = {
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
	'crit-rate': 'шанс крита',
	'crit-rate%': '%шанса крита',
	'crit-dmg': 'крит урон',
	'crit-dmg%': '% крит урона',
	'phys-dmg': 'физ урон',
	'cryo-dmg': 'крио урон',
	'geo-dmg': 'гео урон',
	'anemo-dmg': 'анемо урон',
	'hydro-dmg': 'гидро урон',
	'electro-dmg': 'электро урон',
	'pyro-dmg': 'пиро урон',
	'phys-dmg%': '% физ урона',
	'cryo-dmg%': '% крио урона',
	'geo-dmg%': '% гео урона',
	'anemo-dmg%': '% анемо урона',
	'hydro-dmg%': '% гидро урона',
	'electro-dmg%': '% электро урона',
	'pyro-dmg%': '% пиро урона',
}
export const I18N_STAT_NAMES: StatNames = l(statNamesEN, statNamesRu)[LANG]

const talentTypes: GI_TalentCode[] = ['attack', 'skill', 'burst']
type TalentTypeNames = Record<GI_TalentCode, string>
const talentTypesNamesEN: TalentTypeNames = talentTypes.reduce((p, c) => {
	p[c] = c
	return p
}, {} as TalentTypeNames)
const talentTypesNamesRU: TalentTypeNames = {
	attack: 'обычная атака',
	skill: 'элементальный навык',
	burst: 'взрыв стихии',
}

export const I18N_TALENT_NAMES: TalentTypeNames = l(talentTypesNamesEN, talentTypesNamesRU)[LANG]
type ConjuctionTypes = 'or' | 'and'
const conjTypes: ConjuctionTypes[] = ['or', 'and']
const conjTypesNamesEN: Record<ConjuctionTypes, string> = conjTypes.reduce((p, c) => {
	p[c] = c
	return p
}, {} as Record<ConjuctionTypes, string>)
const conjTypesNamesRU: Record<ConjuctionTypes, string> = {
	or: 'или',
	and: 'и',
}

export const I18N_CONJUCTIONS: Record<ConjuctionTypes, string> = l(conjTypesNamesEN, conjTypesNamesRU)[LANG]
export const I18N_RECOMENDED_FOR = l('Recommended for', 'Рекомендуется для')[LANG]
export const I18N_FOR_NOBODY = l('Nobody', 'Никому')[LANG]
export const I18N_SOURCE = l('Source', 'Источник')[LANG]
export const I18N_SCROLL_TO_ZOOM = l('Scroll to zoom', 'Зум колесиком')[LANG]
export const I18N_PINCH_TO_ZOOM = l('Pinch to zoom', 'Зум щипком')[LANG]
export const I18N_ERROR = l('Error, reload page', 'Ошибка, перезагрузите страницу')[LANG]
export const I18N_PIECE_BONUS = l(
	(n: number) => `${n} piece bonus`,
	(n: number) => `Бонус ${n} части`,
)[LANG]
export const I18N_PIECES_BONUS = l(
	(n: number) => `${n} pieces bonus`,
	(n: number) => `Бонус ${n} частей`,
)[LANG]
export const I18N_BASE_ATTACK = l('Base attack', 'Базовая атака')[LANG]
export const I18N_SECONDARY_STAT = l('Secondary Stat', 'Пассивная способность')[LANG]
type MapCodeName = Record<MapCode, string>
export const I18N_MAP_CODES_NAME: MapCodeName = l(
	{ teyvat: 'Teyvat', enkanomiya: 'Enkanomiya' },
	{ teyvat: 'Тейват', enkanomiya: 'Энканомия' },
)[LANG]
export const I18N_CHAR_BUILD_RECS = l('Character builds recomendations', 'Рекомендуемые сборки персонажей')[
	LANG
]
export const I18N_SELECT_CHAR_ABOVE = l('Select character above', 'Выберите персонажа')[LANG]
export const I18N_BUILD_RECS_FOR = l('build recomendations', 'Рекомендованный билд для')[LANG]
export const I18N_BASED_ON_GIHT = l(
	"Based on Genshin Impact Helper Team's Character Builds",
	'Основано на табличке Геншин Импакт Хелпер Тимы (англ.)',
)[LANG]
export const I18N_ABOUT_SITE = l(`About`, 'О сайте')[LANG]
export const I18N_CREATED_BY_US = l(
	'Designed and coded by Absolute Evil Studio',
	'Задизайнено и закожено в Абсолют Ивел студии',
)[LANG]

type WeaponTypeNames = Record<GI_WeaponTypeCode, string>
const weaponTypeNamesEN: WeaponTypeNames = talentTypes.reduce((p, c) => {
	p[c] = c
	return p
}, {} as WeaponTypeNames)
const weaponTypeNamesRU: WeaponTypeNames = {
	claymore: 'Двуручный меч',
	sword: 'Меч',
	catalyst: 'Катализатор',
	polearm: 'Копье',
	bow: 'Лук',
}
export const I18N_WEAPON_TYPE_NAMES: WeaponTypeNames = l(weaponTypeNamesEN, weaponTypeNamesRU)[LANG]

type WeaponObtainSourceNames = Record<GI_WeaponObtainSource, string>
const weaponObtainSourceNamesEN: WeaponObtainSourceNames = talentTypes.reduce((p, c) => {
	p[c] = c.replace(/-/g, ' ')
	return p
}, {} as WeaponObtainSourceNames)
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
	quest: 'квесты',
	puzzle: 'паззл',
	investigation: 'исследование мира',
	'adventure-rank-10': '10 ранг приключений',
	playstation: 'плейстейшн',
}
export const I18N_WEAPON_OBTAIN_SOURCE_NAMES: WeaponObtainSourceNames = l(
	weaponObtainSourceNamesEN,
	weaponObtainSourceNamesRU,
)[LANG]
export const I18N_OBTAINED_DURING_STORYLINE = l(
	'Obtained during storyline quests',
	'Выдаётся во время прохождения сюжетных заданий',
)[LANG]
