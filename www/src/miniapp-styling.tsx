import { WebApp } from '#lib/telegram/webapp'

/**
 * Old Bot API versions don't have secondary_bg_color, so we need to manually set up this variable.
 * In the future, we can use the CSS rule @container, but it is not fully supported yet, so for now, we use JavaScript
 */
;(() => {
	const root = document.documentElement
	if (!WebApp.isVersionAtLeast('6.1')) {
		if (WebApp.colorScheme === 'light') root.style.setProperty('--tg-theme-secondary-bg-color', '#f4f4f5')
		else root.style.setProperty('--tg-theme-secondary-bg-color', '#0f0f0f')
	}
	if (WebApp.colorScheme === 'light') root.style.setProperty('--app-stat-icon-reverse', '100%')
})()
