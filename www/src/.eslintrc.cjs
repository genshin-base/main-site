module.exports = {
	env: {
		es6: true,
		node: false,
		browser: true,
	},
	extends: ['../../.eslintrc.cjs', 'plugin:react-hooks/recommended'],
	rules: {
		'react-hooks/exhaustive-deps': ['warn', { additionalHooks: '(useFetch)' }],
	},
}
