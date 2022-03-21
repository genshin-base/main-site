import fs from 'fs'
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import ESLintPlugin from 'eslint-webpack-plugin'
import glob from 'glob'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { dirname } from 'path'
import PurgeCSSPlugin from 'purgecss-webpack-plugin'
import { fileURLToPath } from 'url'
import webpack from 'webpack'
import { Deferred, mustBeDefined } from '../lib/utils/values.js'

import { matchPath, paths, pathToStrings } from './src/routes/paths.js'

const LANGS = ['en', 'ru']
const ASSET_PATH = '/'

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

	const ssrBuildReady = prerender ? new Deferred() : null
	const configs = []
	LANGS.forEach((lang, i) => {
		configs.push(makeConfig(mode, i === 0, { isSSR: false, lang, ssrBuildReady }))
	})
	if (ssrBuildReady) configs.push(makeConfig(mode, false, { isSSR: true, ssrBuildReady }))
	return configs
}

/**
 * @param {'production'|'development'} mode
 * @param {boolean} isMain
 * @param {{isSSR:false, ssrBuildReady:Deferred<void>|null, lang:string}
 *   | {isSSR:true, ssrBuildReady:Deferred<void>}} type
 */
function makeConfig(mode, isMain, type) {
	const isProd = mode === 'production'
	const suffix = type.isSSR ? 'ssr' : type.lang
	const dist = DIST + '/' + (type.isSSR ? 'ssr' : 'browser')

	return {
		name: `build-${suffix}`,
		mode: mode,
		bail: isProd, //в прод-режиме останавливаем сборку после первой ошибки
		stats: { preset: isProd ? 'normal' : 'errors-warnings' },
		devtool: isProd ? 'source-map' : 'cheap-module-source-map',
		devServer: isMain ? makeDevServerConfig(isProd) : undefined,
		entry: `${SRC}/index.tsx`,
		target: type.isSSR ? 'node' : 'web',
		output: {
			path: dist,
			filename: isProd && !type.isSSR ? `[name].${suffix}.[contenthash:8].js` : `[name].${suffix}.js`,
			// пока не нужно, см. file-loader
			// assetModuleFilename: '[name].[hash:8][ext]',
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
				// Новые-модные вебпаковые ассеты (https://webpack.js.org/guides/asset-modules/)
				// экспортируют CommonJS, ради подключения которого вебпак добавляет в бандл
				// пол килобайта всякого мусора.
				// Это некритично, но, раз уж я два часа разбирался в этой фигне, пусть тут
				// пока полежит фикс: отключение фичи ассетов (javascript/auto) и использование
				// устаревшего file-loader'а.
				// Ждём, когда тут появится возможность экспортировать ES-модули
				// https://github.com/webpack/webpack/blob/main/lib/asset/AssetGenerator.js#L272
				{
					test: /\.(png|svg|json)$/,
					type: 'javascript/auto',
				},
				{
					test: /\.(png|svg|json)$/,
					loader: 'file-loader',
					options: {
						name: '[name].[hash:8].[ext]',
						emitFile: isMain,
					},
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(mode),
				'BUNDLE_ENV.ASSET_PATH': JSON.stringify(ASSET_PATH),
				'BUNDLE_ENV.LANGS': JSON.stringify(LANGS),
				'BUNDLE_ENV.LANG': type.isSSR ? 'global._SSR_LANG' : JSON.stringify(type.lang),
				'BUNDLE_ENV.IS_SSR': JSON.stringify(type.isSSR),
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
				variables: true,
			}),
			!type.isSSR &&
				new HtmlWebpackPlugin({
					template: `${SRC}/index.html`,
					minify: false,
					filename: `${dist}/${type.lang === 'en' ? '' : type.lang + '/'}_common_index.html`,
				}),
			isMain &&
				new HtmlWebpackPlugin({
					template: `${SRC}/404.html`,
					templateParameters: { LANGS },
					inject: false,
					minify: false,
					filename: `${dist}/404.html`,
				}),
			isProd && !type.isSSR && copyIndexHtmls(type.lang, type.ssrBuildReady),
			isProd &&
				type.isSSR && {
					apply(compiler) {
						compiler.hooks.done.tap('SignalBuildEnd', compilation => {
							type.ssrBuildReady.resolve()
						})
					},
				},
		].filter(Boolean),
	}
}

let pagePrerenderSemaphore = Promise.resolve()
/**
 * @param {string} lang
 * @param {Deferred<void>|null} ssrBuildReady
 */
function copyIndexHtmls(lang, ssrBuildReady) {
	/**
	 * @template T
	 * @param {string} pathname
	 * @param {() => Promise<T>|T} func
	 * @returns {Promise<T>}
	 */
	async function withPageEnv(pathname, func) {
		const items = {
			_SSR_LANG: lang,
			_SSR_READ_PUBLIC: path =>
				fs.readFileSync(PUBLIC + new URL('http://a.com/' + path).pathname, { encoding: 'utf-8' }),
			self: {},
			navigator: { language: lang },
			location: { pathname },
			localStorage: { getItem: () => undefined, setItem: () => undefined },
		}

		Object.assign(global, items)
		const res = await func()
		for (const attr in items) delete global[attr]

		return res
	}

	return {
		apply(compiler) {
			compiler.hooks.compilation.tap('PrepareIndexHTMLs', compilation => {
				HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise(
					'PrepareIndexHTMLs',
					async data => {
						if (data.outputName.endsWith('_common_index.html')) {
							await pagePrerenderSemaphore
							await (pagePrerenderSemaphore = (async () => {
								let renderPage = null
								if (ssrBuildReady) {
									await ssrBuildReady.promise
									;({ renderPage } = await withPageEnv('/', () =>
										// файлу нужен суффикс, чтоб он для каждого языка импортировался отдельно со своим _SSR_LANG
										import(DIST + '/ssr/main.ssr.js?lang=' + lang),
									))
								}

								compilation.deleteAsset(data.outputName)
								for (const path of Object.values(paths)) {
									for (const url of pathToStrings('', prefixedPath(lang, path))) {
										let html = mustBeDefined(data.html)
										if (renderPage) html = await withPageEnv(url, () => renderPage(html))

										const src = new webpack.sources.RawSource(html, false)
										const fpath = cutLeadingSlash(url + '/index.html')
										compilation.emitAsset(fpath, src, {})
									}
								}
							})())
						}
						return data
					},
				)

				HtmlWebpackPlugin.getHooks(compilation).afterEmit.tapPromise(
					'PrepareIndexHTMLs',
					async data => {
						if (data.outputName.endsWith('_common_index.html'))
							compilation.deleteAsset(data.outputName)
						return data
					},
				)
			})
		},
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
									return (lang === 'en' ? '' : '/' + lang) + `/_common_index.html`
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

/** @param {string} str */
function cutLeadingSlash(str) {
	return str.startsWith('/') ? str.slice(1) : str
}
