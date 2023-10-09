import { URLSearchParams } from 'url'
import { Telegraf } from 'telegraf'
import { loadCharacters, loadTranslatedBuilds } from '../scripts/_common.js'
import Koa from 'koa'
import { koaBody } from 'koa-body'
import crypto from 'crypto'
import { mustBeDefined, mustBeNotNull } from '#lib/utils/values.js'
import { getBuildSummaryPath } from '#lib/www-utils/summaries.js'
import {
	I18N_BUILD_SUMMARY_SHARING_CAPTION,
	I18N_NO_BUILD_FOUND,
	chooseLang,
	chooseLangVal,
} from '#lib/i18n.js'
import { TrigramSearcher } from '#lib/trigrams.js'
import { getInlineText } from '#lib/parsing/helperteam/text.js'
import { message } from 'telegraf/filters'

const TG_BOT_TOKEN = mustGetEnv('TG_BOT_TOKEN')
const MEDIA_URL = mustGetEnv('MEDIA_URL')
const WEBAPP_URL = mustGetEnv('WEBAPP_URL')
const LANGS = ['ru', 'en']

const WEBAPP_SECRET_KEY = HMAC_SHA256(TG_BOT_TOKEN, 'WebAppData').digest()

const code2character = await loadCharacters()
const builds = await loadTranslatedBuilds()

/** @type {TrigramSearcher<{id:String, title:string, characterCode:string, roleCode:string}>} */
const searcher = new TrigramSearcher()
for (const buildCharacter of builds.characters) {
	const character = code2character[buildCharacter.code]
	for (const role of buildCharacter.roles) {
		for (const lang of LANGS) {
			const title = `${character.name[lang]} ${getRoleNameStr(role.name[lang])}`
			const id = `${character.code} ${role.code}`.slice(0, 64)
			searcher.add(title.toLocaleLowerCase(), {
				id,
				title,
				characterCode: character.code,
				roleCode: role.code,
			})
		}
	}
}

// =====

const bot = new Telegraf(TG_BOT_TOKEN)

// bot.command('test', ctx => ctx.reply('bla'))

bot.on(message('text'), ctx => {
	const lang = chooseLang(ctx.update.message.from.language_code, LANGS)

	const res = searcher.getN(ctx.update.message.text.toLocaleLowerCase(), 1)[0]
	if (res.sim === 0) {
		ctx.reply(chooseLangVal(lang, I18N_NO_BUILD_FOUND))
		return
	}

	const caption = chooseLangVal(
		lang,
		I18N_BUILD_SUMMARY_SHARING_CAPTION,
	)(WEBAPP_URL + `?startapp=_${res.val.characterCode}`)

	bot.telegram
		.sendPhoto(
			ctx.update.message.from.id,
			getBuildSummaryPath(MEDIA_URL, res.val.characterCode, res.val.roleCode, lang, 'jpg'),
			{ caption },
		)
		.catch(console.error)

	// ctx.reply(chooseLangVal(lang, I18N_BUILD_SUMMARY_SHARING_CAPTION)(WEBAPP_URL))
})

bot.launch()

// =====

const app = new Koa()

app.use(koaBody({ jsonLimit: '1kb', json: true, jsonStrict: true }))

app.use(async ctx => {
	if (ctx.method === 'POST' && ctx.path === '/api/webapp/share') {
		const body = ctx.request.body

		const initData = getValidatedInitData(body.initData + '')
		if (!initData) return ctx.throw(400)

		const user = JSON.parse(mustBeNotNull(initData.get('user')))
		const lang = chooseLang(user.language_code, LANGS)

		const characterCode = body.character
		const roleCode = body.role
		const roles = builds.characters.find(x => x.code === characterCode)?.roles
		if (!roles) return ctx.throw(400)
		if (!roles.includes(roleCode)) return ctx.throw(400)

		const caption = chooseLangVal(
			lang,
			I18N_BUILD_SUMMARY_SHARING_CAPTION,
		)(WEBAPP_URL + `?startapp=_${characterCode}`)

		await bot.telegram.sendPhoto(
			user.id,
			getBuildSummaryPath(MEDIA_URL, characterCode, roleCode, lang, 'jpg'),
			{ caption },
		)

		ctx.body = { status: 'ok' }
	} else {
		ctx.throw(404)
	}
})

app.listen(8088)

/** @param {string} initData */
function getValidatedInitData(initData) {
	const initDataMap = new URLSearchParams(initData)

	const dataCheckString = Array.from(initDataMap.entries(), ([key, val]) => `${key}=${val}`)
		.filter(x => !x.startsWith('hash='))
		.sort()
		.join('\n')

	const hash = HMAC_SHA256(dataCheckString, WEBAPP_SECRET_KEY).digest('hex')

	return initDataMap.get('hash') === hash ? initDataMap : null
}

/**
 * @param {crypto.BinaryLike} value
 * @param {crypto.BinaryLike} secretKey
 */
function HMAC_SHA256(value, secretKey) {
	const hmac = crypto.createHmac('sha256', secretKey)
	return hmac.update(value)
}

/**
 * @param {string} key
 * @returns {string}
 */
function mustGetEnv(key) {
	const val = process.env[key] ?? ''
	if (!val) throw new Error(`env variable ${key} is required`)
	return val
}

/**  @param {import('#lib/parsing/helperteam/text').CompactTextParagraphs|null} node */
function getRoleNameStr(node) {
	if (node === null) return ''
	if (typeof node === 'string') return node
	if (Array.isArray(node)) return node.map(getRoleNameStr).join(' ')
	if ('p' in node) return getRoleNameStr(node.p)
	return getInlineText(node)
}

/*
Отображение картиночных результатов во всех клиентах по-своему сломано, потому inline_query пока не используется.

const characters = await loadCharacters()
const builds = await loadTranslatedBuilds()

/** @type {TrigramSearcher<{id:String, title:string, characterCode:string, roleCode:string}>} *
const searcher = new TrigramSearcher()
for (const buildCharacter of builds.characters) {
	const character = characters[buildCharacter.code]
	for (const role of buildCharacter.roles) {
		for (const lang of LANGS) {
			const title = `${character.name[lang]} ${getRoleNameStr(role.name[lang])}`
			const id = `${character.code} ${role.code}`.slice(0, 64)
			searcher.add(title.toLocaleLowerCase(), {
				id,
				title,
				characterCode: character.code,
				roleCode: role.code,
			})
		}
	}
}

bot.on('inline_query', async ctx => {
	console.log(ctx.inlineQuery)
	const lang = chooseLang(ctx.inlineQuery.from.language_code ?? '')

	// https://core.telegram.org/bots/api#answerinlinequery
	// No more than 50 results per query are allowed.
	const maxResults = 50
	const res = searcher.getN(ctx.inlineQuery.query.toLocaleLowerCase(), maxResults).filter(x => x.sim > 0)

	/** @type {import('telegraf/typings/core/types/typegram').InlineQueryResult[]} *
	const answerItems = res.map(x => ({
		type: 'photo',
		id: x.val.id,
		photo_url: `.../media/summaries/builds/${
			x.val.characterCode
		}/${x.val.roleCode.replace(/[\s/\[\]]/g, '-')}-en.jpg`,
		thumbnail_url: `.../media/summaries/builds/${
			x.val.characterCode
		}/${x.val.roleCode.replace(/[\s/\[\]]/g, '-')}-en-thumb.jpg`,
		title: x.val.title,
		description: 'bla bla descr',
		caption: 'text http://ya.ru',
		photo_width: 120,
		photo_height: 120,
	}))

	if (answerItems.length > 0) {
		answerItems.push({
			type: 'article',
			id: 'shameful-formatting-workaround',
			title: 'genshin-base.com',
			description: 'подробнее на сайте',
			thumbnail_url: '.../favicon.png',
			input_message_content: { message_text: 'genshin-base.com' + (lang === 'en' ? '' : '/' + lang) },
		})
	}

	await ctx.answerInlineQuery(
		answerItems,
		{
			cache_time: 0,
			is_personal: false,
			next_offset: '',
			button: {
				text: 'Найти через миниприложение',
				web_app: { url: 'https://t.me/TheVeryTest2Bot/bla1' },
			},
		},
	)
})

/**  @param {import('#lib/parsing/helperteam/text').CompactTextParagraphs|null} node *
function getRoleNameStr(node) {
	if (node === null) return ''
	if (typeof node === 'string') return node
	if (Array.isArray(node)) return node.map(getRoleNameStr).join(' ')
	if ('p' in node) return getRoleNameStr(node.p)
	return getInlineText(node)
}
*/
