var ToggleNightModeButton = (function () {
	'use strict';

	const nightModeLabels = {
		en: { // css capitalize capitalizes everything, its wrong
			day: 'Switch to Night Mode',
			night: 'Switch to Day Mode'
		},
	};

	class ToggleNightModeButton {
		constructor({ parentEl, isDayMode, onChange, params = {} }) {
			this.locale = params.locale || 'en';
			let button = document.createElement('div');
			this.button = button;
			button.className = 'ae-toggle-night-mode-button ae-huge-action-button';

			parentEl.appendChild(button);
			button.addEventListener('click', function (e) {
				{
					isDayMode = !isDayMode;
					onChange(isDayMode);
				}
			});
			this.toggleState(isDayMode);
		}
		toggleState(isDayMode) {
			this.button.textContent = isDayMode ? nightModeLabels[this.locale].day : nightModeLabels[this.locale].night;
		}
	}

	return ToggleNightModeButton;

})();
