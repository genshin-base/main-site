#!/usr/bin/env node
import os from 'os'
import http from 'http'
import { promises as fs } from 'fs'
import { BASE_DIR, WWW_MEDIA_DIR, loadTranslatedBuilds } from './_common.js'
import { error, info, warn } from '#lib/utils/logs.js'
import puppeteer from 'puppeteer'
import url from 'url'
import { mustBeDefined, mustBeNotNull } from '#lib/utils/values.js'
import { ignoreNotExists } from '#lib/utils/os.js'

const LANGS = ['en', 'ru']

const browserBuildDir = BASE_DIR + '/www/dist/browser'
const publicDir = BASE_DIR + '/www/public'
const buildSummariesDir = WWW_MEDIA_DIR + '/summaries/builds'

try {
	const stat = await fs.stat(browserBuildDir)
	if (Date.now() - stat.mtimeMs > 5 * 60 * 1000)
		warn('www/dist/browser seems old, forgot to run `npm run build`?')
} catch (ex) {
	if (ex.code === 'ENOENT') error('www/dist/browser is missing, forgot to run `npm run build`?')
	else error(ex)
	process.exit(1)
}

await withTempDir(async staticRoot => {
	info('copying files...')
	await fs.cp(publicDir, staticRoot, { recursive: true })
	await fs.cp(browserBuildDir, staticRoot, { recursive: true })

	info('starting server...')
	const server = http.createServer(async (req, res) => {
		// console.log(req.url)
		const path = staticRoot + '/' + url.parse(req.url ?? '').pathname
		const data = await fs.readFile(path).catch(err => {
			if (err.code === 'EISDIR') return fs.readFile(path + '/index.html')
			throw err
		})
		res.write(data)
		res.end()
	})
	const port = 8089
	server.listen(8089)

	info('loading builds...')
	const builds = await loadTranslatedBuilds()

	info('processing pages...')
	const browsers = Array(8)
		.fill(0)
		.map(() => {
			return puppeteer.launch({
				headless: 'new',
				defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1.5 },
			})
		})

	await fs.rm(buildSummariesDir, { recursive: true }).catch(ignoreNotExists)
	for (const character of builds.characters) {
		for (const lang of LANGS) {
			const { browser, i: browserI } = await Promise.race(
				browsers.map((x, i) => x.then(browser => ({ browser, i }))),
			)

			browsers[browserI] = (async () => {
				const stt = Date.now()
				info(`${character.code}-${lang}: loading page...`)
				const langPart = lang === 'en' ? '' : lang + '/'
				const url = `http://127.0.0.1:${port}/${langPart}builds/${character.code}`
				const page = await browser.newPage()
				await page.goto(url, { waitUntil: 'networkidle0' })

				const roleBtns = {}
				for (const btn of await page.$$(`[data-summary-role-code]`)) {
					const code = mustBeNotNull(
						await btn.evaluate(x => x.getAttribute('data-summary-role-code')),
					)
					roleBtns[code] = btn
				}

				for (const role of character.roles) {
					const roleBtn = mustBeDefined(roleBtns[role.code])
					await roleBtn.evaluate(x => x.click())
					await page.waitForNetworkIdle({ idleTime: 500 })

					await page.evaluate(() => {
						document.querySelectorAll('.summary-hide').forEach(x => x.remove())
					})

					info(`  ${character.code}-${lang} ${role.code}: taking screenshot...`)
					const mainBox = await page.$('main')
					if (!mainBox) throw new Error('content wrap not found on page')
					const box = mustBeNotNull(await mainBox.boundingBox())
					const outDir = `${buildSummariesDir}/${character.code}`
					await fs.mkdir(outDir, { recursive: true })

					const path = `${outDir}/${role.code.replace(/[\s/\[\]]/g, '-')}-${lang}.png`
					await page.screenshot({ path, clip: box })
				}

				await page.close()
				info(`  ${character.code}-${lang}: done, ${Date.now() - stt}ms`)

				return browser
			})()
		}
	}

	await Promise.all(browsers.map(x => x.then(x => x.close())))

	server.close()
	info('done.')
})

/**
 * @param {(dir:string) => unknown} func
 */
async function withTempDir(func) {
	const dir = await fs.mkdtemp(os.tmpdir() + '/genshin-base-render-')
	try {
		await func(dir)
	} catch (ex) {
		error(ex)
		error('press Ctrl+D key to remove ' + dir)
		await new Promise(res => process.stdin.once('data', res))
	} finally {
		await fs.rm(dir, { recursive: true })
	}
}
