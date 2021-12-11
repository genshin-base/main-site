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
const DIST = __dirname + '/dist'
const PUBLIC = __dirname + '/public'

export default async function (env, argv) {
	if (argv.mode !== 'production' && argv.mode !== 'development') throw new Error('wrong mode: ' + argv.mode)

	const isProd = argv.mode === 'production'

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
			publicPath: '/',
		},
		resolve: {
			extensions: ['.js', '.tsx', '.ts'],
			alias: { src: SRC },
		},
		optimization: {
			minimize: isProd,
		},
		module: {
			// роняет билд при попытке импортировать из модуля то, что он не экспортирует
			strictExportPresence: true,
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
				{
					test: /\.(png|svg)$/,
					loader: 'file-loader',
					options: { name: '[name].[hash:8].[ext]' },
				},
			],
		},
		plugins: [
			new webpack.DefinePlugin({
				'process.env.NODE_ENV': JSON.stringify(argv.mode),
			}),
			new ESLintPlugin({
				context: SRC,
				extensions: ['.js', '.ts', '.tsx'],
				lintDirtyModulesOnly: !isProd,
			}),
			// заставляет писать пути к модулям в правильном регистре (даже в ОСях, где это не обязательно)
			!isProd && new CaseSensitivePathsPlugin({}),
			new MiniCssExtractPlugin({ filename: isProd ? '[name].[contenthash:8].css' : '[name].css' }),
			new HtmlWebpackPlugin({ template: SRC + '/index.html' }),
			new PurgeCSSPlugin({
				paths: glob.sync(`${SRC}/**/*`, { nodir: true }),
				variables: true,
			}),
		].filter(Boolean),
	}
}
