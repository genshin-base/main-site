import { LINK_DISCORD_INVITE } from '#src/utils/links'
import { LANG } from './i18n'

export const I18N_ABOUT_SITE_EPIGRAPH = {
	en: { quote: 'A site to be hold!', footer: 'The head shrine maiden in charge of', cite: 'Grand Shrine' },
	ru: { quote: 'Сайт, достойный созерцания!', footer: 'Верховная жрица', cite: 'Великого храма' },
}[LANG]
export const I18N_ABOUT_SITE_CONTENT = {
	en: () => (
		<>
			<p>
				The Genshin Base is a site that contains only the necessary information about Genshin Impact.
				The site is equally convenient to use both from a computer and from a phone.
			</p>
			<p>
				We welcome any support. If you want to become a part of our team, arrange a collaboration or
				just chat, we are waiting for you in our{' '}
				<a className="link" target="_blank" href={LINK_DISCORD_INVITE}>
					Discord
				</a>
				.
			</p>
			<p>
				Surfing once again on the Internet in search of actual information about character builds, I
				felt indignant. I spent a lot of time collecting information bit by bit from different places.
				Badly designed pictures with recommendations for leveling characters, the date of which was
				almost equal to the release date of the game, or complicated Google tables, funny articles
				translated by an electronic translator from copywriters for two pennies who have never seen
				the game. Unable to endure it any longer, I called my few comrades together and announced: we
				are making a site on Genshin. We start today.
			</p>
			<p>
				A week passed and we started. First of all, we decided to make a page with builds. Based on
				one of the few usable tables, I came up with a universal character page design. It turned out
				that for such a design, information from the table alone was not enough — we had to take
				information from four more sites.
			</p>
			<p>
				The result is a section that contains the detailed information needed to level up and unlock
				the potential of a character. For each character defined the team roles. For each role there
				are lists of recommended artifacts, weapons, talents, as well as tips for playing this role.
			</p>
			<p>
				For each artifact, weapon, or material needed to upgrade a character or weapon, there are
				cards with a detailed description and information about where this item is obtained. Also, for
				artifacts and weapons there are always character recommendations.
			</p>
			<p>
				But this seemed to us not enough. The site, consisting of a single section, looks somehow dry.
				We started thinking about what else to add. After analyzing our needs as players, we came to
				the conclusion that it would be good to show on the main page information for game planning.
				Firstly, we add a block with information about what is farmed today and tomorrow in dungeons,
				so users can plan where to spend the resin, and the time until the end of the day on different
				servers. Secondly, we designed a block with a summary of the character build. At the same
				time, a system of favorites appeared: now any character and any material can be added to
				favorites. Selected materials are highlighted on the main page. Information about selected
				characters is also displayed there.
			</p>
			<p>
				The last thing I added was the Alchemy Calculator. A third of our team of three people laugh
				at him, but I find it extremely useful. It is designed to simplify the calculation of the
				necessary resources for leveling up talent books, as well as materials for characters and
				weapons.
			</p>
			<p>
				We have many plans for the future. Our goal is to make the most complete and useful site about
				Genshin. And we need your help. Message to us on{' '}
				<a className="link" target="_blank" href={LINK_DISCORD_INVITE}>
					Discord
				</a>{' '}
				if you want to participate in the development.
			</p>
		</>
	),
	ru: () => (
		<>
			<p>
				База Геншина — сайт, на котором собрана только нужная информация по Геншин Импакту. Сайтом
				одинаково удобно пользоваться как с компьютера, так и с телефона.
			</p>
			<p>
				Мы будем рады любой поддержке. Если вы хотите стать частью нашей команды, устроить
				коллаборацию или просто пообщаться — ждем вас у нас в{' '}
				<a className="link" target="_blank" href={LINK_DISCORD_INVITE}>
					Дискорде
				</a>
				.
			</p>
			<p>
				Лазая в очередной раз по интернетам в поисках актуальных билдов персонажей, я испытал
				негодование. Кучу времени приходится тратить на то, чтобы собрать информацию по крупицам из
				разных мест. Эти плохо свёрстанные картинки с рекомендациями по прокачке персонажей, дата
				составления которых чуть ли не равна дате релиза игры, сложно составленные таблички в Гугле,
				смешные статьи, переведенные электронным переводчиком от копирайтеров за две копейки, которые
				никогда не видели игру. Не в силах больше это терпеть, я созвал своих немногочисленных
				товарищей и объявил: мы делаем сайт по Геншину. Начинаем сегодня.
			</p>
			<p>
				Не прошло и недели, как мы начали. В первую очередь было решено сделать страницу с билдами.
				Взяв за основу одну из немногих адекватных таблиц, я придумал универсальный дизайн страницы
				персонажа. Правда, оказалось, что для такого дизайна информации с одной только таблички
				недостаточно — пришлось брать информацию ещё с четырех сайтов.
			</p>
			<p>
				Результатом стал раздел, который содержит детальную информацию, необходимую для развития и
				раскрытия потенциала персонажа. Для каждого персонажа определены роли, которые он может
				выполнять в отряде. Для каждой роли, в свою очередь, составлены списки рекомендованных
				артефактов, оружия, талантов, а так же написаны заметки об особенностях игры на данной роли.
			</p>
			<p>
				Для каждого артефакта, оружия или материала, необходимого для улучшения персонажа или оружия,
				составлены карточки с подробным описанием характеристик и информацией о том, где данный
				предмет добывается. Также для артефактов и оружия всегда видны рекомендованные персонажи.
			</p>
			<p>
				Но этого нам показалось мало. Как-то сухо выглядит сайт, состоящий из одного-единственного
				раздела. Мы начали думать, что еще можно добавить. Проанализировав наши потребности как
				игроков, мы пришли к выводу, что хорошо было бы вывести на главной информацию для планирования
				игры. Первым стал блок о том, что добывается сегодня и завтра в данжах, чтобы было удобно
				планировать, куда тратить смолу, и время до окончания дня на разных серверах. Вторым — блок с
				кратким содержание билда персонажей. Одновременно с этим появилось система избранных: теперь
				любого персонажа и любой материал для улучшения можно добавить в избранное. Избранные
				материалы выделяются на главной. Там же выводится и информация об избранных персонажах —
				например, какие артефакты рекомендуется носить и какие таланты улучшать.
			</p>
			<p>
				Последним я добавил Алхимический калькулятор. Треть нашей команды из трех человек над ним
				смеётся, но я считаю его крайне полезным. Он призван упростить расчёт необходимых ресурсов для
				улучшения книжек талантов, а также материалов для улучшения персонажей и оружия.
			</p>
			<p>
				У нас много планов на будущее. Наша цель — сделать самый полный и полезный сайт по Геншину. И
				нам нужна ваша помощь. Пишите нам в{' '}
				<a className="link" target="_blank" href={LINK_DISCORD_INVITE}>
					Дискорд
				</a>
				, если хотите поучаствовать в разработке.
			</p>
		</>
	),
}[LANG]()
