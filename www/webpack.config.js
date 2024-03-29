import fs from 'fs'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import ESLintPlugin from 'eslint-webpack-plugin'
import glob from 'glob'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { dirname, extname, relative } from 'path'
import { PurgeCSSPlugin } from 'purgecss-webpack-plugin'
import { fileURLToPath } from 'url'
import webpack from 'webpack'
import doT from 'dot'

import { Deferred, mustBeNotNull } from '#lib/utils/values.js'
import { matchPath, paths, pathToStrings } from './src/routes/paths.js'
import { runAndReadStdout } from '#lib/utils/os.js'

const LANGS = ['en', 'ru']
const ASSET_PATH = '/'
const PROD_HOSTNAME = 'genshin-base.com'
const REFLANG_ORIGIN = 'https://genshin-base.com'
const SUPPORTED_DOMAINS = ['127.0.0.1', PROD_HOSTNAME, 'translate.goog'] //см. "Сторонние сайты" в README.md

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const SRC = __dirname + '/src'
const LIB = __dirname + '/../lib'
const DIST = __dirname + '/dist'
const PUBLIC = __dirname + '/public'

export default async function (env, argv) {
	const mode = argv.mode
	if (mode !== 'production' && mode !== 'development') throw new Error('wrong mode: ' + mode)
	const prerender = !env['no-prerender'] && mode === 'production'

	const commitHash = (await runAndReadStdout('git', ['rev-parse', 'HEAD'])).trim()
	const lastTag = (await runAndReadStdout('git', ['describe', '--tags', '--abbrev=0'])).trim()
	const commitDate = (await runAndReadStdout('git', ['log', '-1', '--format=%cs'])).trim()
	const version = { commitHash, lastTag, commitDate }

	const cfg = makeConfig.bind(null, mode, version)
	const ssrBuildBarrier = prerender ? new Deferred() : null
	const configs = []
	LANGS.forEach((lang, i) => {
		configs.push(cfg(i === 0, { isSSR: false, lang, ssrBuildBarrier }))
	})
	if (ssrBuildBarrier) configs.push(cfg(false, { isSSR: true, ssrBuildBarrier }))
	return configs
}

/**
 * @param {'production'|'development'} mode
 * @param {{commitHash:string, lastTag:string, commitDate:string}} version
 * @param {boolean} isMain
 * @param {{isSSR:false, ssrBuildBarrier:Deferred<void>|null, lang:string}
 *   | {isSSR:true, ssrBuildBarrier:Deferred<void>}} type
 */
function makeConfig(mode, version, isMain, type) {
	const isProd = mode === 'production'
	const suffix = type.isSSR ? 'ssr' : type.lang
	const dist = DIST + '/' + (type.isSSR ? 'ssr' : 'browser')

	return {
		name: `build-${suffix}`,
		mode: mode,
		bail: isProd, //в прод-режиме останавливаем сборку после первой ошибки
		stats: {
			preset: isProd ? 'normal' : 'errors-warnings',
			errorDetails: true,
		},
		devtool: isProd ? 'source-map' : 'cheap-module-source-map',
		devServer: isMain ? makeDevServerConfig(isProd) : undefined,
		entry: `${SRC}/index.tsx`,
		target: type.isSSR ? 'node' : 'web',
		output: {
			path: dist,
			filename: isProd && !type.isSSR ? `[name].${suffix}.[contenthash:8].js` : `[name].${suffix}.js`,
			assetModuleFilename: ({ filename }) => `${relative(SRC, dirname(filename))}/[name].[hash:8][ext]`,
			publicPath: ASSET_PATH,
			// чтоб в бандле был экспорт
			...(type.isSSR ? { libraryTarget: 'module', chunkFormat: 'module' } : {}),
		},
		experiments: {
			outputModule: true,
		},
		resolve: {
			extensions: ['.js', '.tsx', '.ts'],
			alias: { '#lib': LIB, '#src': SRC },
		},
		optimization: {
			minimize: isProd && !type.isSSR,
			splitChunks: {
				chunks: type.isSSR ? () => false : 'async',
				cacheGroups: {
					defaultVendors: false, //отключаем дефолтный отдельный чанк для вендоров
					default: { name: 'async' },
				},
			},
		},
		module: {
			// роняет билд при попытке импортировать из модуля то, что он не экспортирует
			strictExportPresence: false,
			rules: [
				{
					test: /\.tsx?$/,
					use: [
						{
							loader: 'ts-loader',
							options: {
								configFile: __dirname + `/tsconfig.json`,
								compilerOptions: {
									// noEmit отключается здесь, чтоб на tsconfig.json не вешалась ошибка
									// типа "не могу перезаписать webpack.config.js"
									noEmit: false,
									sourceMap: true,
								},
							},
						},
					],
					include: SRC,
				},
				{
					test: /\.js$/,
					include: SRC,
				},
				{
					test: /\.s[ac]ss$/i,
					use: [
						{ loader: MiniCssExtractPlugin.loader, options: { emit: true } },
						'css-loader',
						'sass-loader',
					],
				},
				{
					test: /\.(png|jpe?g|webp|svg|json)$/,
					type: 'asset/resource',
					generator: { emit: isMain },
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(mode),
				'BUNDLE_ENV.ASSET_PATH': JSON.stringify(ASSET_PATH),
				'BUNDLE_ENV.LANGS': JSON.stringify(LANGS),
				'BUNDLE_ENV.LANG': type.isSSR ? 'SSR_ENV.lang' : JSON.stringify(type.lang),
				'BUNDLE_ENV.IS_SSR': JSON.stringify(type.isSSR),
				'BUNDLE_ENV.VERSION': JSON.stringify(version),
				'BUNDLE_ENV.SUPPORTED_DOMAINS': JSON.stringify(isProd ? SUPPORTED_DOMAINS : null),
			}),
			new ESLintPlugin({
				context: SRC,
				extensions: ['.js', '.ts', '.tsx'],
				lintDirtyModulesOnly: !isProd,
			}),
			// заставляет писать пути к модулям в правильном регистре (даже в ОСях, где это необязательно)
			!isProd && new CaseSensitivePathsPlugin({}),
			new MiniCssExtractPlugin({ filename: isProd ? '[name].[contenthash:8].css' : '[name].css' }),
			new PurgeCSSPlugin({
				paths: glob.sync(`${SRC}/**/*`, { nodir: true }),
				variables: true, //remove unused CSS variables
				blocklist: [],
				safelist: [],
			}),
			!type.isSSR &&
				new GenerateIndexHtmls({
					template: `${SRC}/index.html`,
					lang: type.lang,
					ssrBuildBarrier: type.ssrBuildBarrier,
					onlyFront: !isProd,
				}),
			!type.isSSR &&
				new DotHtmlPlugin({
					template: `${SRC}/404.html`,
					filename: '404.html',
					params: { LANGS },
				}),
			type.isSSR && {
				apply(compiler) {
					compiler.hooks.done.tap('SignalBuildEnd', compilation => {
						type.ssrBuildBarrier.resolve()
					})
				},
			},
		].filter(Boolean),
	}
}

/**
 * @class
 * @param {{template:string, filename:string, params:unknown}} opts
 */
function DotHtmlPlugin({ template, filename, params }) {
	/** @param {webpack.Compiler} compiler */
	this.apply = compiler => {
		compiler.hooks.thisCompilation.tap(DotHtmlPlugin.name, async compilation => {
			compilation.hooks.processAssets.tapPromise(
				{
					name: DotHtmlPlugin.name,
					stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
				},
				async assets => {
					const text = await fs.promises.readFile(template, 'utf-8')
					const tmpl = doT.template(text, { strip: false }, {})
					compilation.fileDependencies.add(template)
					compilation.emitAsset(filename, new webpack.sources.RawSource(tmpl(params)))
				},
			)
		})
	}
}

let pagePrerenderSemaphore = /**@type {Promise<unknown>}*/ (Promise.resolve())
/**
 * @class
 * @param {object} opts
 * @param {string} opts.template
 * @param {string} opts.lang
 * @param {Deferred<void>|null} opts.ssrBuildBarrier барьер для ожидания окончания сборки SSR-бандла
 *   (если не задан, пререндера не будет)
 * @param {boolean} opts.onlyFront
 */
function GenerateIndexHtmls({ template, lang, ssrBuildBarrier, onlyFront }) {
	/**
	 * Засовывает в global разные значения для эмуляции браузерной страницы.
	 * Удаляет их после выполнения func().
	 * @template T
	 * @param {string} pathname
	 * @param {() => Promise<T>|T} func
	 * @returns {Promise<T>}
	 */
	async function withPageEnv(pathname, func) {
		await pagePrerenderSemaphore
		return await (pagePrerenderSemaphore = (async () => {
			const key = Math.random() //на всякий случай

			const items = {
				/** @type {typeof SSR_ENV} */
				SSR_ENV: {
					key,
					lang,
					readPublic: path =>
						fs.readFileSync(PUBLIC + new URL('http://a/' + path).pathname, { encoding: 'utf-8' }),
					outPageDescription: null,
				},
				self: {},
				navigator: { language: lang },
				location: { origin: PROD_HOSTNAME, pathname, search: '', hash: '' },
				localStorage: { getItem: () => undefined, setItem: () => undefined },
				document: { title: '' },
				innerWidth: 1280,
				innerHeight: 680,
				window: {},
			}
			items.window = items

			Object.assign(global, items)
			const res = await func()
			for (const attr in items) delete global[attr]

			if (items.SSR_ENV.key !== key) throw new Error('concurrent render, this must NOT happen')
			return res
		})())
	}

	/** @param {webpack.Compiler} compiler */
	this.apply = compiler => {
		compiler.hooks.thisCompilation.tap(GenerateIndexHtmls.name, async compilation => {
			compilation.hooks.processAssets.tapPromise(
				{
					name: GenerateIndexHtmls.name,
					stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
				},
				async assets => {
					// парсим шаблон
					const text = await fs.promises.readFile(template, 'utf-8')
					const tmpl = doT.template(text, { strip: false, encoders: { attr: escapeHtmlAttr } }, {})

					// получаем функцию для пререндера (если он нужен)
					let renderContent = /**@type {import('#src/index').SSRRenderFunc|null}*/ (null)
					if (ssrBuildBarrier) {
						await ssrBuildBarrier.promise
						;({ renderContent } = await withPageEnv('/', () =>
							// файлу нужен суффикс, чтоб он для каждого языка импортировался отдельно со своим SSR_ENV.lang
							import(DIST + '/ssr/main.ssr.js?lang=' + lang),
						))
					}

					// собраем ассеты
					const files = { css: [], js: [] }
					for (const entry of compilation.entrypoints.values())
						for (const f of entry.getFiles()) {
							const meta = compilation.getAsset(f)?.info ?? {}
							// пропускаем модули вебпакового хотрелоада
							if (!meta.hotModuleReplacement && !meta.development)
								files[extname(f).slice(1)]?.push('/' + f)
						}

					// рендерим страницы
					const pathsToUse = onlyFront ? [paths.front] : paths

					compilation.fileDependencies.add(template)
					for (const path of Object.values(pathsToUse)) {
						for (const urlBase of pathToStrings('', path)) {
							const url = prefixedStrPath(lang, urlBase)

							const [content, title, description] = renderContent
								? await withPageEnv(url, async () => [
										await mustBeNotNull(renderContent)(),
										document.title,
										SSR_ENV.outPageDescription,
								  ])
								: ['', '', null]

							// адреса страницы для других языков (для `<link hreflang`)
							const otherLangs = LANGS.filter(x => x !== lang).map(lang => ({
								lang,
								href: REFLANG_ORIGIN + prefixedStrPath(lang, urlBase),
							}))

							const html = tmpl({ title, content, description, files, otherLangs })
							const src = new webpack.sources.RawSource(html, false)
							const fpath = cutLeadingSlash(url + '/index.html')
							compilation.emitAsset(fpath, src, {})
						}
					}
				},
			)
		})
	}
}

function makeDevServerConfig(isProd) {
	const langsEnLast = LANGS.slice().sort((a, b) => (a === 'en' ? 1 : -1))
	return {
		hot: !isProd,
		client: {
			overlay: { errors: true, warnings: false },
		},
		static: {
			directory: PUBLIC,
			serveIndex: false,
			watch: true,
		},
		historyApiFallback: {
			rewrites: [
				{
					from: /./,
					to({ parsedUrl, match, request }) {
						for (const lang of langsEnLast) {
							for (const path of Object.values(paths)) {
								if (matchPath(prefixedPath(lang, path), parsedUrl.pathname))
									return prefixedStrPath(lang, '/index.html')
							}
						}
						return '/404.html'
					},
				},
			],
		},
	}
}

/**
 * @param {string} lang
 * @param {import('./src/routes/router').RoutePath} path
 */
function prefixedPath(lang, path) {
	return lang === 'en' ? path : ['/' + lang, ...path]
}
/**
 * @param {string} lang
 * @param {string} path
 */
function prefixedStrPath(lang, path) {
	return (lang === 'en' ? '' : '/' + lang) + path
}

/** @param {string} str */
function cutLeadingSlash(str) {
	return str.startsWith('/') ? str.slice(1) : str
}

/** @param {string} str */
function escapeHtmlAttr(str) {
	return str.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
}
