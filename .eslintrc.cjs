module.exports = {
	root: true,
	env: {
		es6: true,
		node: true,
		browser: false,
	},
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 'latest',
	},
	extends: ['prettier', 'plugin:@typescript-eslint/recommended'],
	rules: {
		'no-unused-vars': ['warn', { vars: 'all', args: 'none' }],
		'no-constant-condition': ['error', { checkLoops: false }],
		'prefer-const': ['warn'],
		eqeqeq: ['warn', 'always'],
		'@typescript-eslint/no-unused-vars': ['warn', { vars: 'all', args: 'none' }],
		'@typescript-eslint/no-extra-semi': 'off', //conflicts with prettier
		'@typescript-eslint/ban-ts-comment': 'off',
	},
}
