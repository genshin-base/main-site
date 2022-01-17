import { default as webpack } from 'webpack'
import { default as CaseSensitivePathsPlugin } from 'case-sensitive-paths-webpack-plugin'
import { fileURLToPath } from 'url'
import { dirname } from 'path/posix'
import { default as ESLintPlugin } from 'eslint-webpack-plugin'
import { default as MiniCssExtractPlugin } from 'mini-css-extract-plugin'
import { default as HtmlWebpackPlugin } from 'html-webpack-plugin'
import { default as PurgeCSSPlugin } from 'purgecss-webpack-plugin'
import { default as glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const SRC = __dirname + '/src'
const LIB = __dirname + '/../lib'
const DIST = __dirname + '/dist'
const PUBLIC = __dirname + '/public'

export default async function (env, argv) {
	if (argv.mode !== 'production' && argv.mode !== 'development') throw new Error('wrong mode: ' + argv.mode)

	const isProd = argv.mode === 'production'
	const assetPath = '/'

	return {
		mode: argv.mode,
		bail: isProd, //в прод-режиме останавливаем сборку после первой ошибки
		stats: { preset: isProd ? 'normal' : 'errors-warnings' },
		devtool: isProd ? 'source-map' : 'cheap-module-source-map',
		devServer: {
			hot: !isProd,
			client: {
				overlay: { errors: true, warnings: false },
			},
			static: {
				directory: PUBLIC,
				serveIndex: false,
				watch: true,
			},
		},
		entry: `${SRC}/index.tsx`,
		output: {
			path: DIST,
			filename: isProd ? '[name].[contenthash:8].js' : '[name].js',
			// пока не нужно, см. file-loader
			// assetModuleFilename: '[name].[hash:8][ext]',
			publicPath: assetPath,
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
					use: [MiniCssExtractPlugin.loader, 'css-loader', 'sass-loader'],
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
					options: { name: '[name].[hash:8].[ext]' },
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(argv.mode),
				'process.env.ASSET_PATH': JSON.stringify(assetPath),
			}),
			new ESLintPlugin({
				context: SRC,
				extensions: ['.js', '.ts', '.tsx'],
				lintDirtyModulesOnly: !isProd,
			}),
			// заставляет писать пути к модулям в правильном регистре (даже в ОСях, где это необязательно)
			!isProd && new CaseSensitivePathsPlugin({}),
			new MiniCssExtractPlugin({ filename: isProd ? '[name].[contenthash:8].css' : '[name].css' }),
			new HtmlWebpackPlugin({ template: SRC + '/index.html', minify: false }),
			new PurgeCSSPlugin({
				paths: glob.sync(`${SRC}/**/*`, { nodir: true }),
				variables: true,
			}),
		].filter(Boolean),
	}
}
