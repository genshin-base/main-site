import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin'
import ESLintPlugin from 'eslint-webpack-plugin'
import glob from 'glob'
import HtmlWebpackPlugin from 'html-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import { dirname } from 'path'
import PurgeCSSPlugin from 'purgecss-webpack-plugin'
import { fileURLToPath } from 'url'
import webpack from 'webpack'

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
	return LANGS.map((lang, i) => makeConfig(mode, lang, i === 0))
}

/**
 * @param {'production'|'development'} mode
 * @param {string} lang
 * @param {boolean} isMain
 */
function makeConfig(mode, lang, isMain) {
	const isProd = mode === 'production'

	return {
		name: `build-${lang}`,
		mode: mode,
		bail: isProd, //в прод-режиме останавливаем сборку после первой ошибки
		stats: { preset: isProd ? 'normal' : 'errors-warnings' },
		devtool: isProd ? 'source-map' : 'cheap-module-source-map',
		devServer: isMain ? makeDevServerConfig(isProd) : undefined,
		entry: `${SRC}/index.tsx`,
		output: {
			path: DIST,
			filename: isProd ? `[name].${lang}.[contenthash:8].js` : `[name].${lang}.js`,
			// пока не нужно, см. file-loader
			// assetModuleFilename: '[name].[hash:8][ext]',
			publicPath: ASSET_PATH,
		},
		experiments: {
			outputModule: true,
		},
		resolve: {
			extensions: ['.js', '.tsx', '.ts'],
			alias: { '#lib': LIB, '#src': SRC },
		},
		optimization: {
			minimize: isProd,
			splitChunks: {
				chunks: 'async',
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
				'BUNDLE_ENV.LANG': JSON.stringify(lang),
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
			new HtmlWebpackPlugin({
				template: `${SRC}/index.html`,
				minify: false,
				filename: `${DIST}/${lang === 'en' ? '' : lang + '/'}index.html`,
			}),
			isMain &&
				new HtmlWebpackPlugin({
					template: `${SRC}/404.html`,
					templateParameters: { LANGS },
					inject: false,
					minify: false,
					filename: `${DIST}/404.html`,
				}),
			isProd && {
				apply(compiler) {
					compiler.hooks.compilation.tap('CopyIndex', compilation => {
						HtmlWebpackPlugin.getHooks(compilation).beforeEmit.tapPromise(
							'CopyIndex',
							async (data, cb) => {
								if (data.outputName.endsWith('index.html'))
									for (const path of Object.values(paths)) {
										for (const fpath of pathToStrings('', prefixedPath(lang, path))) {
											const src = new webpack.sources.RawSource(data.html, false)
											compilation.emitAsset(fpath + '/index.html', src, {})
										}
									}
								return data
							},
						)
					})
				},
			},
		].filter(Boolean),
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
									return (lang === 'en' ? '' : '/' + lang) + `/index.html`
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
