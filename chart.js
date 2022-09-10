var Graph = (function () {
	'use strict';

	class ChartCore {
		constructor({
			wrap,
			modules,
			canvases,
			animValues,
			onSpeedupRequest = null,
			onRedrawStart = null,
			onAnimationEnd = null,
		}) {
			this.wrap = wrap;
			this.modules = modules;
			this.canvases = canvases;
			this.animValues = animValues;
			this.redrawRequested = false;

			this.onRedrawStart = onRedrawStart;
			this.onAnimationEnd = onAnimationEnd;
			this.animationEndTimeout = null;
			this._onAnimationEnd_bind = this._onAnimationEnd.bind(this);

			this.recordNextFrameDelta = false;
			this.lastFrameStamp = 0;
			this.lastFrameComplexity = 1;
			this.redrawMeasuredOnce = false;
			this.frameDeltas = new Array(10).fill(1000 / 60);
			this.speedupLevel = 0;
			this.onSpeedupRequest = onSpeedupRequest;

			this.modules.forEach(m => m.connect(this));
			this.resize();
		}

		_updateSpeedupLevel(levelDelta, fillFps) {
			let newLevel = Math.max(0, Math.min(this.speedupLevel + levelDelta, 3));
			if (newLevel == this.speedupLevel) return
			//if (location.hash == '#t') return
			this.speedupLevel = newLevel;
			//console.log('new level', this.speedupLevel)

			if (levelDelta > 0) {
				this.frameDeltas.fill(1000 / fillFps);
				this.onSpeedupRequest(this.speedupLevel);
			} else {
				this.frameDeltas.fill(1000 / fillFps);
				this.onSpeedupRequest(this.speedupLevel);
			}
		}
		_checkFramePerformance(delta) {
			if (this.onSpeedupRequest == null) return

			if (this.recordNextFrameDelta) {
				this.frameDeltas.unshift(delta / this.lastFrameComplexity);
				if (this.frameDeltas.length > 60) this.frameDeltas.pop();
				this.recordNextFrameDelta = false;
			}

			let sum = 0;
			for (let i = 0; i < this.frameDeltas.length; i++) sum += this.frameDeltas[i];
			let avg = sum / this.frameDeltas.length;
			//console.log(1000/avg, 1000/delta, delta)

			if (avg > 1000 / 50) {
				this._updateSpeedupLevel(1, 51);
			} else if (avg < 1000 / 55) {
				this._updateSpeedupLevel(-1, 54);
			}

			this.lastFrameComplexity = 1;
		}

		_onAnimationEnd() {
			this.animationEndTimeout = null;
			this.onAnimationEnd();
		}

		increaseCurFrameComplexity(inc) {
			this.lastFrameComplexity += inc;
		}

		addAnimValues(values) {
			for (let value of values)
				if (this.animValues.indexOf(value) == -1) this.animValues.push(value);
		}
		removeAnimValues(values) {
			for (let value of values)
				for (let i = 0; i < this.animValues.length; i++)
					if (this.animValues[i] == value) {
						this.animValues.splice(i, 1);
						i -= 1;
						break
					}
		}

		redraw(timedelta) {
			this.animValues.forEach(v => v.update(timedelta / 16));
			this.recordNextFrameDelta = true;

			if (this.onRedrawStart !== null) this.onRedrawStart();

			this.modules.forEach(m => m.redraw(this));

			if (this.animValues.some(v => !v.finished())) this.requestRedraw();
			if (!this.redrawRequested) this.recordNextFrameDelta = false;

			clearTimeout(this.animationEndTimeout);
			let deltas = this.frameDeltas;
			let delta = ((deltas[0] + deltas[1] + deltas[3]) / 3) * 2;
			this.animationEndTimeout = setTimeout(this._onAnimationEnd_bind, delta);
		}

		resize() {
			let changed = false;
			for (let c of this.canvases) if (c.resize()) changed = true;
			// TODO: не совсем правильно проверять ресайз только по канвасам, но сейчас всё привязано к ним, и этого достаточно
			if (changed) {
				this.modules.forEach(m => m.resize());
				this.requestRedraw();
			}
		}

		requestRedraw() {
			if (this.redrawRequested) return
			window.requestAnimationFrame(stamp => {
				this.redrawRequested = false;

				let realDelta = stamp - this.lastFrameStamp;
				let clampedDelta = Math.min(realDelta, 32);
				this.lastFrameStamp = stamp;
				this._checkFramePerformance(clampedDelta);

				let stt = performance.now();
				this.redraw(realDelta);
				if (!this.redrawMeasuredOnce) {
					this.redrawMeasuredOnce = true;
					let delta = performance.now() - stt;
					// если первый кадр ну очень медленно отрисовался, сразу запрашиваем ускорение
					if (1000 / delta < 20) this._updateSpeedupLevel(2, 54);
					else if (1000 / delta < 35) this._updateSpeedupLevel(1, 54);
				}
			}, this.wrap);
			this.redrawRequested = true;
		}

		redrawCurrentState() {
			this.recordNextFrameDelta = false;
			this.modules.forEach(m => m.redraw(this));
		}

		ignoreCurFrameDelta() {
			this.recordNextFrameDelta = false;
		}

		destroy() {
			this.modules.forEach(m => m.disconnect());
		}
	}

	let DateSecond = 1000;
	let DateMinute = DateSecond * 60;
	let DateHour = DateMinute * 60;
	let DateDay = DateHour * 24;
	const dateHour = DateHour;
	const dateDay = DateDay;

	function dateToHHMM(dtime){
		let date = new Date(dtime);
		let hours = date.getHours();
		let minutes = '0' + date.getMinutes();
		return `${hours}:${minutes.substr(-2)}`
	}
	function dateToMM(dtime){
		let date = new Date(dtime);
		let minutes = '0' + date.getMinutes();
		return minutes.substr(-2)
	}

	function formatLongNums(num, digits = 2) {
		var si = [
			{ value: 1, symbol: '' },
			{ value: 1E3, symbol: 'K' },
			{ value: 1E6, symbol: 'M' },
			{ value: 1E9, symbol: 'G' },
			{ value: 1E12, symbol: 'T' },
			{ value: 1E15, symbol: 'P' },
			{ value: 1E18, symbol: 'E' }
		];
		var rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
		var i;
		for (i = si.length - 1; i > 0; i--) {
			if (num >= si[i].value) {
				break;
			}
		}
		return (num / si[i].value).toFixed(digits).replace(rx, '$1') + si[i].symbol
	}
	function bLongNums(x, locale) {
		if (!x) return x
		let parts = x.toString().split('.');
		parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		return parts.join('.')
	}

	const monthNames = {
		en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
	};
	const dayNames = {
		en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
	};
	const emptyChartLabels = {
		en: 'No data available, please change filtration settings'
	};
	const labels = {
		zoomOut: {
			en: 'Zoom Out'
		},
		slowLoading: {
			en: 'Loading is slower than expected…'
		},
		loadingError: {
			en: 'Loading failed, zooming-out'
		}, 
		expandFilters: {
			en: 'Expand filters'
		}, 
		collapseFilters: {
			en: 'Collapse filters'
		}, 
	};

	const DEFAULT_CONFIG = {
		locale: 'en',
		chart: {
			top: 25,
			left: 20,
			right: 20,
			height: Math.floor(Math.min(window.innerHeight * 0.4 || 324, 324)),
			minDaysRangePerYear: 30,
			lineWidth: 2,
		},
		minimap: {
			marginTop: 44,
			bottom: 6,
			height: 48,
			frame: {
				hThick: 2,
				vThick: 10,
				interactionXOffset: { outer: 21, inner: 21 },
				color: {
					day: '#c0d1e1',
					night: '#56626D',
				},
				abroadColors: {
					day: 'rgba(241,246,249,0.7)',
					night: 'rgba(26,37,50,0.5)',
				},
			},
			lineWidth: 1.5,
		},
		scales: {
			labelHeightPx: 19,
			animDuration: 200,
			lineColor: {
				day: 'rgba(24, 45, 59, 0.1)',
				night: 'rgba(255, 255, 255, 0.1)',
			},
			labelColor: {
				day: 'rgba(37, 37, 41, 0.5)',
				night: 'rgba(163, 177, 194, 0.6)',
			},
			labelStroke: {
				day: '#fff',
				night: '#1c2533',
			},
			fontSize: 12,
			labelLinePadding: 8,
			horLinePadding: 20,
		},
		tooltip: {
			background: {
				day: '#fff',
				night: '#1c2533',
			},
			shadow: {
				day: '0 1pt 4pt 0 rgba(125,125,125,0.3)',
				night: 'none',
			},
			maxWidth: 196,
		},
		background: {
			day: 'rgba(255, 255, 255, 1)',
			dayTransparent: 'rgba(255, 255, 255, 0)',
			night: '#242f3e',
			nightTransparent: 'rgba(36, 47, 62, 0)',
		},
		inlineAction: {
			day: '#108be3',
			night: '#36a8f1',
		},
		text: {
			day: '#182D3B',
			night: '#fff',
		},
		autoresize: true,
	};

	let DC_scales = DEFAULT_CONFIG.scales;
	let labelHeightPx = DC_scales.fontSize + DC_scales.labelLinePadding;

	class HScalesModule {
		constructor({ canvasExt, getEnds, locale, config, theme, isDisabled, getCurrPartData }) {
			this.locale = locale;
			this.labelsBuff = [];
			this.labelsByValue = {};
			this.minColWidth = 100;
			this.prev_delta = 0;
			this.getEnds = getEnds;
			this.width = calcWidth(canvasExt);
			this.canvasExt = canvasExt;
			this.config = config;
			this.labelConfig = {};
			this.setTheme(theme);
			this.isDisabled = isDisabled;
			this.getCurrPartData = getCurrPartData;
			this.isInitial = true;
		}
		setTheme(theme) {
			this.theme = theme;
			let c = this.config;
			new Array('lineColor', 'labelStroke',
				'labelColor', 'labelLinePadding',
				'animDuration').forEach(k => this.labelConfig[k] = c[k][theme] ? c[k][theme] : c[k]);

			this.gradient = this.canvasExt.rc.createLinearGradient(0, 0, 0, DEFAULT_CONFIG.chart.top);
			this.gradient.addColorStop(0, DEFAULT_CONFIG.background[theme]);
			this.gradient.addColorStop(1, DEFAULT_CONFIG.background[`${theme}Transparent`]);
		}
		connect(core) { }
		disconnect() { }
		resize() {
			this.width = calcWidth(this.canvasExt);
			this.fullWidth = calcFullWidth(this.canvasExt);
			this.maxLabelsOnScreenVar = this.maxLabelsOnScreen();
		}
		redraw(core) {
			let topPadding = DEFAULT_CONFIG.chart.top;
			let yPos = DEFAULT_CONFIG.chart.height + DC_scales.horLinePadding;
			let config = this.labelConfig;
			let isInitial = this.isInitial;
			this.isInitial = false;

			let ends = this.getEnds();
			let start_dtime = ends.start_dtime;
			let end_dtime = ends.end_dtime;
			let mode = null;

			this.drawGradient();
			if (this.isDisabled()) return this.applyNewLabels({}, []) //ось выключена

			let delta = Math.floor(end_dtime - start_dtime);
			if (this.prev_delta != delta) mode = 'zoomIn';
			this.prev_delta = delta;
			let lineWidth = this.width;

			let newValues;
			let startDate = new Date(start_dtime);
			let endDate = new Date(end_dtime);
			let currDate = new Date();
			let valueFormat = '';
			if (delta < 2 * dateDay) {
				let colStartDtime = startDate.setMinutes(0);
				let colEndDtime = endDate.setMinutes(0);

				let step = calcStep(dateHour, this.minColWidth / 2, lineWidth, start_dtime, end_dtime);

				colStartDtime = colStartDtime - step;
				colEndDtime = colEndDtime + step;

				let currDateDtime = currDate.setHours(0, 0, 0, 0);
				newValues = getLabeledValues(colStartDtime, colEndDtime, currDateDtime, step);
				valueFormat = 'Minutes';
			} else if (delta < 90 * dateDay) {
				let colStartDtime = startDate.setHours(0, 0, 0, 0);
				let colEndDtime = endDate.setHours(0, 0, 0, 0);

				let step = calcStep(dateDay, this.minColWidth, lineWidth, start_dtime, end_dtime);

				colStartDtime = colStartDtime - step;
				colEndDtime = colEndDtime + step;

				let currDateDtime = currDate.setHours(0, 0, 0, 0);
				newValues = getLabeledValues(colStartDtime, colEndDtime, currDateDtime, step);
			} else {
				let colStartMonthNumber = startDate.getMonth() + 12 * startDate.getFullYear();
				let colEndMonthNumber = endDate.getMonth() + 12 * endDate.getFullYear();

				let step = calcStep(1, this.minColWidth, lineWidth, startDate.getTime() / (dateDay * 30), endDate.getTime() / (dateDay * 30));
				let anchorVal = currDate.getMonth() + 12 * currDate.getFullYear();
				newValues = getLabeledValuesForMonthes(colStartMonthNumber, colEndMonthNumber, anchorVal, step);
				valueFormat = 'Year';
			}
			let oldValues = Object.keys(this.labelsByValue).map(v => +v);
			let allValues = new Set(newValues);
			oldValues.forEach(ov => allValues.add(ov));
			let newLabelsByValue = {};
			let newLabels = [];
			let now = Date.now();
			let isRedrawNeeded = false;

			allValues.forEach(value => {
				let oldLabel = this.labelsByValue[value];
				let isAlreadyShown = !!oldLabel || isInitial;
				let isNoLongerNeeded = !~newValues.indexOf(value);
				oldLabel = oldLabel || {};
				let textVal = this.getText(value, valueFormat);

				let label = {
					value: textVal,
					xPos: (value - start_dtime) / getValInPxl(start_dtime, end_dtime, lineWidth),
					yPos: yPos + topPadding,
					textAlign: 'left',
					fadeOutStart: isNoLongerNeeded ? oldLabel.fadeOutStart ? oldLabel.fadeOutStart : now : null,
					fadeInStart: (!isAlreadyShown && mode == 'zoomIn') || oldLabel.fadeInStart ? oldLabel.fadeInStart ? oldLabel.fadeInStart : now : null,
				};
				label = Object.assign(label, config);
				if (label.fadeInStart && (now - label.fadeInStart) > config.animDuration) label.fadeInStart = null;
				if (label.fadeOutStart && (now - label.fadeOutStart) > config.animDuration) return
				newLabelsByValue[value] = label;
				isRedrawNeeded = isRedrawNeeded || label.fadeInStart || label.fadeOutStart;
				newLabels.push(label);
			});
			if (newLabels.length > this.maxLabelsOnScreenVar) {
				newLabels.sort(function (a, b) {
					return a.fadeOutStart > b.fadeOutStart
				});
				let removingCount = newLabels.length - this.maxLabelsOnScreenVar;
				let count = 0;
				newLabels = newLabels.map(l => {
					if(!l.fadeOutStart) return l
					count ++; 
					if(count < removingCount){
						l.fadeOutStart = l.fadeOutStart - 65*3;
						return l
					} else {
						return l
					}
				});
			}
			this.applyNewLabels(newLabelsByValue, newLabels);
			if (isRedrawNeeded) core.requestRedraw();
		}
		maxLabelsOnScreen() {
			return this.width / this.minColWidth * 2
		}
		applyNewLabels(newLabelsByValue, newLabels) {
			this.labelsByValue = newLabelsByValue;
			this.labelsBuff = newLabels;
			this.drawLabels(this.canvasExt, newLabels);
		}
		drawLabels() {
			this.clearLine();
			drawLabels(this.canvasExt, this.labelsBuff);
		}
		drawGradient() {
			if (this.getCurrPartData().isPercentage) return
			let rc = this.canvasExt.rc;
			rc.fillStyle = this.gradient;
			rc.fillRect(0, 0, rc.canvas.width, DEFAULT_CONFIG.chart.top);
		}
		getText(value, format) {
			if (!format) return this.getLabelTextContent(value)
			if (format == 'Year') return this.getLabelTextContentYear(value)
			if (format == 'Minutes') return this.getLabelTextContentMinutes(value)
		}
		getLabelTextContent(value) {
			let date = new Date(value);
			return `${date.getDate()} ${monthNames[this.locale][date.getMonth()]}`
		}
		getLabelTextContentYear(value) {
			let date = new Date(value);
			return `${date.getFullYear()} ${monthNames[this.locale][date.getMonth()]}`
		}
		getLabelTextContentMinutes(value) {
			return dateToHHMM(value)
		}
		clearLine() {
			let rc = this.canvasExt.rc;
			rc.save();
			rc.scale(this.canvasExt.pixelRatio, this.canvasExt.pixelRatio);
			rc.clearRect(0, DEFAULT_CONFIG.chart.height + DEFAULT_CONFIG.chart.top, this.fullWidth, DEFAULT_CONFIG.minimap.marginTop - 5);
			rc.restore();
		}
	}
	class VScalesModule {
		constructor({ canvasExt, getEnds, locale, stickTo, labelColor, config, theme, getCurrPartData }) {
			this.locale = locale;
			this.labelsBuff = [];
			this.labelsByValue = {};
			this.prev_delta = 0;
			this.getEnds = getEnds;
			this.canvasExt = canvasExt;
			this.width = calcWidth(canvasExt);
			this.refreshTimeout;
			this.fixedMidValueOnSlide;
			this.changedMaxTimeout;
			this.stickTo = stickTo;
			this.labelColor = labelColor;
			this.config = config;
			this.labelConfig = {};
			this.setTheme(theme);
			this.getCurrPartData = getCurrPartData;
			this.isInitial = true;
		}
		setTheme(theme) {
			this.theme = theme;
			let c = this.config;
			new Array('lineColor', 'labelStroke',
				'labelColor', 'labelLinePadding',
				'animDuration').forEach(k => this.labelConfig[k] = c[k][theme] ? c[k][theme] : c[k]);
			if (this.labelColor) this.labelConfig.labelColor = this.labelColor;
		}
		connect(core) { }
		disconnect() { }
		resize() {
			this.width = calcWidth(this.canvasExt);
		}
		setZoomFromOutside(isZoomed) {
			this.isZoomed = isZoomed;
		}
		isLabelsHiddenInZoom() {
			if (this.isZoomed && this.getCurrPartData().isPercentage) return true
			return false
		}
		redraw(core) {
			let topPadding = DEFAULT_CONFIG.chart.top;
			let config = this.labelConfig;
			let isInitial = this.isInitial;
			this.isInitial = false;

			let isThisRightAxis = this.stickTo == 'right';
			let xPos = isThisRightAxis ? this.width + DEFAULT_CONFIG.chart.right : DEFAULT_CONFIG.chart.left;
			let zeroPos = DEFAULT_CONFIG.chart.height + topPadding;
			let textAlign = isThisRightAxis ? 'end' : 'start';
			let ends = this.getEnds();
			let isPercentage = this.getCurrPartData().isPercentage;
			if (isThisRightAxis && !ends.isLeftLimitVisible || !isThisRightAxis && ends.isLeftLimitVisible)
				this.isWithLines = true; //левая ось выключена или тут перерисовывается левая
			else this.isWithLines = false;
			if (!isThisRightAxis && !ends.isLeftLimitVisible ||
				isThisRightAxis && !ends.isRightLimitVisible)
				return this.applyNewLabels({}, []) //ось выключена
			if (this.isLabelsHiddenInZoom()) {
				return this.applyNewLabels({}, [])
			}
			let lineWidth = this.width;
			let lineHeight = DEFAULT_CONFIG.chart.height - topPadding;
			let start_val = ends.start_value;
			let end_val = ends.end_value;
			let final_end_val = ends.final_end_value;
			let final_start_val = ends.final_start_value;
			let valInPx = getValInPxl(final_end_val, final_start_val, DEFAULT_CONFIG.chart.height);
			let topFixHeight = 0;

			if (!isPercentage) {
				topFixHeight = topPadding;
				let topFix = topPadding * valInPx;
				final_end_val = final_end_val - topFix;
				end_val = end_val - topFix;
			}

			let currInterval = final_end_val - final_start_val;
			let changedPxls = Math.abs((this.prevInterval || 0) - currInterval) / valInPx;
			let isAnimationNeeded = !changedPxls || changedPxls > 60;
			this.prevInterval = final_end_val - final_start_val;
			if (!isAnimationNeeded) {
				final_end_val = end_val;
				final_start_val = start_val;
			}
			this.prevInterval = final_end_val - final_start_val;


			let step = this.calcStep(final_start_val, final_end_val);
			let newValues = getLabeledValues(final_start_val, final_end_val, final_start_val, step);

			let allValues = new Set(newValues);
			let oldValues = Object.keys(this.labelsByValue).map(v => +v); //в оси У старые пропадают без анимации
			oldValues.forEach(ov => allValues.add(ov));
			let newLabelsByValue = {};
			let newLabels = [];
			let now = Date.now() + 16;
			allValues = [...allValues];
			allValues.sort((a, b) => a - b);
			let isRedrawNeeded = false;
			allValues.forEach(value => {
				value = Math.floor(value);
				let oldLabel = this.labelsByValue[value];
				let isAlreadyShown = !!oldLabel || isInitial;
				let isNoLongerNeeded = !~newValues.indexOf(value);
				oldLabel = oldLabel || {};
				let label = {
					value: this.getLabelTextContent(value),
					yPos: (end_val - value) / getValInPxl(start_val, end_val, lineHeight + topPadding - topFixHeight) + topPadding + topFixHeight - config.labelLinePadding,
					xPos: xPos,
					lineXPos: DEFAULT_CONFIG.chart.left,
					textAlign: textAlign,
					fadeOutStart: isNoLongerNeeded ? oldLabel.fadeOutStart ? oldLabel.fadeOutStart : isAnimationNeeded ? now : null : null,
					fadeInStart: !isAlreadyShown || oldLabel.fadeInStart ? oldLabel.fadeInStart ? oldLabel.fadeInStart : isAnimationNeeded ? now : null : null,
					lineWidth: lineWidth,
				};
				label = Object.assign(label, config);
				if (zeroPos - label.yPos < labelHeightPx) label.withoutLine = true;
				if (label.fadeInStart && (now - label.fadeInStart) > config.animDuration) label.fadeInStart = null;
				if (label.fadeOutStart && (now - label.fadeOutStart) > config.animDuration) return
				if (isNoLongerNeeded && !isAnimationNeeded) return
				if (label.yPos > DEFAULT_CONFIG.chart.height + DEFAULT_CONFIG.chart.top) return
				newLabelsByValue[value] = label;
				isRedrawNeeded = isRedrawNeeded || label.fadeInStart || label.fadeOutStart;
				newLabels.push(label);
			});
			this.applyNewLabels(newLabelsByValue, newLabels);
			if (isRedrawNeeded) core.requestRedraw();
		}
		applyNewLabels(newLabelsByValue, newLabels) {
			this.labelsByValue = newLabelsByValue;
			this.labelsBuff = newLabels;
			this.drawLabels(this.canvasExt, newLabels);
		}
		getLabelTextContent(value) {
			return formatLongNums(value)
		}
		calcStep(start_val, end_val) {
			return Math.floor((end_val - start_val) / 5)
		}
		drawLabels() {
			if (this.stickTo != 'right') this.clearArea();
			let cE = this.canvasExt;
			drawLabels(cE, this.labelsBuff, this.isWithLines);
			if (!this.isWithLines || !this.labelsBuff.length) return
			let c = DEFAULT_CONFIG.chart;
			let rc = cE.rc;
			let yPos = c.top + c.height - 1;
			let xPos = c.left;
			rc.save();
			rc.scale(cE.pixelRatio, cE.pixelRatio);
			rc.beginPath();
			rc.lineWidth = 1;
			rc.strokeStyle = this.labelConfig.lineColor;
			rc.moveTo(xPos, yPos);
			rc.lineTo(xPos + this.width, yPos);
			rc.stroke();
			rc.restore();
		}
		clearArea() {
			let rc = this.canvasExt.rc;
			rc.save();
			rc.scale(this.canvasExt.pixelRatio, this.canvasExt.pixelRatio);
			rc.clearRect(0, 0, this.canvasExt.cssWidth, DEFAULT_CONFIG.chart.height + DEFAULT_CONFIG.chart.top);
			rc.restore();
		}
	}

	function calcWidth(canvasExt) {
		return calcFullWidth(canvasExt) - DEFAULT_CONFIG.chart.left - DEFAULT_CONFIG.chart.right
	}
	function calcFullWidth(canvasExt) {
		return canvasExt.cssWidth
	}
	function drawLabels(canvasExt, labels, isWithLines) {
		if (!labels.length) return
		let rc = canvasExt.rc;
		rc.save();
		rc.scale(canvasExt.pixelRatio, canvasExt.pixelRatio);
		let now = Date.now();
		rc.lineWidth = 1;
		if (isWithLines) rc.beginPath();
		let prevLabelColor = null;
		labels.forEach(l => {
			let alpha = 1;
			if (l.fadeInStart) alpha = Math.max(now - l.fadeInStart, 0) != 0 ? (now - l.fadeInStart) / l.animDuration : 0;
			if (l.fadeOutStart) alpha = Math.max(now - l.fadeOutStart, 0) != 0 ? 1 - (now - l.fadeOutStart) / l.animDuration : 1;
			rc.font = `${DEFAULT_CONFIG.scales.fontSize}px sans-serif`;
			rc.textAlign = l.textAlign;

			rc.globalAlpha = Math.min(1, alpha);
			if (prevLabelColor != l.labelColor) {
				rc.fillStyle = l.labelColor;
				prevLabelColor == l.labelColor;
			}
			rc.fillText(l.value, Math.round(l.xPos), Math.round(l.yPos));

			if (isWithLines && !l.withoutLine) {
				if (rc.globalAlpha < 1) rc.globalAlpha = 0;
				let yPos = l.yPos + l.labelLinePadding;
				rc.strokeStyle = l.lineColor;
				rc.moveTo(Math.round(l.lineXPos), yPos);
				rc.lineTo(Math.round(l.lineXPos + l.lineWidth), yPos);
			}
		});
		if (isWithLines) rc.stroke();
		rc.restore();
	}

	function getValInPxl(endVal, startVal, lineWidth) {
		return Math.abs(endVal - startVal) / lineWidth
	}

	function calcStep(minStep, minColWidth, lineWidth, startVal, endVal) {
		// шаг между выводимыми надписями. Должен быть кратен степени двойки
		let valInPxl = getValInPxl(endVal, startVal, lineWidth);
		let stepInMinCol = minColWidth * valInPxl;
		if (stepInMinCol < minStep) return minStep
		let step = minStep * Math.ceil(stepInMinCol / minStep);
		// if((step / minStep) % 2) step += minStep
		var arr = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
		return arr.find(el => { return el >= (step / minStep) }) * minStep
	}
	// anchorVal - значение, которое нужно обязательно стараться вывести. 
	// на шкале дат это сегодня
	function getLabeledValues(startVal, endVal, anchorVal, step) {
		// фильтрует все возможные значения и оставляет только те, что нужно выводить
		// значения должны включать в себя якорное
		let dif = (startVal - anchorVal) / step;
		//нужно найти среди переданного интервала значений одно такое, которое можно достичь шагая от якорного
		let startAValue = Math.ceil(dif) * step + anchorVal;
		let labeledValues = [];
		// используя предыдушее значение, найти все остальные шаги
		for (let i = startAValue; i <= endVal; i += step) {
			labeledValues.push(Math.floor(i));
		}
		return labeledValues
	}
	function getLabeledValuesForMonthes(colStartMonthNumber, colEndMonthNumber, anchorMonthNumber, step) {
		// number = year * 12 + <number in month>
		let dif = (colStartMonthNumber - anchorMonthNumber) / step;
		//нужно найти среди переданного интервала значений одно такое, которое можно достичь шагая от якорного
		let startAValue = Math.ceil(dif) * step + anchorMonthNumber;
		let labeledValues = [];
		// используя предыдушее значение, найти все остальные шаги
		for (let i = startAValue; i <= colEndMonthNumber; i += step) {
			labeledValues.push(new Date(Math.floor(i / 12), i % 12, 1).getTime());
		}
		return labeledValues
	}

	//TODO: mouse+touch

	class Point {
		constructor(id, x, y) {
			this.id = id;
			this.x = x;
			this.y = y;
		}

		static fromTouch(t, dx, dy) {
			return new Point(t.identifier, t.clientX + dx, t.clientY + dy)
		}

		update(t, dx, dy) {
			this.x = t.clientX + dx;
			this.y = t.clientY + dy;
		}

		distanceFrom(point) {
			return this.distanceFromXY(point.x, point.y)
		}

		distanceFromXY(x, y) {
			let dx = this.x - x;
			let dy = this.y - y;
			return Math.sqrt(dx * dx + dy * dy)
		}
	}

	function wrapWithOffset(offsetElem, func) {
		return function(e) {
			let rect = offsetElem.getBoundingClientRect();
			return func(e, -rect.left, -rect.top) && e.preventDefault()
		}
	}

	function wrapAndBindWithOffset(config, offsetElem, context) {
		let res = {};
		for (let [eventName, elem, func] of config) {
			func = func || context[eventName];
			let funcBind = wrapWithOffset(offsetElem, func.bind(context));
			res[func.name] = { event: eventName, elem, func: funcBind };
		}
		return res
	}

	class ControlDouble {
		constructor({
			startElem,
			stopElem = window,
			offsetElem = null,
			leaveElem = null,
			callbacks,
		}) {
			offsetElem = offsetElem || startElem;
			leaveElem = leaveElem || startElem;
			this.mouse = new Point('mouse', 0, 0);
			this.touches = [];

			this.callbacks = {};
			let noop = () => false;
			let handlerNames = [
				'singleDown',
				'singleMove',
				'singleUp',
				'doubleDown',
				'doubleMove',
				'doubleUp',
				'wheelRot',
				'singleHover',
				'singleLeave',
			];
			for (let name of handlerNames) this.callbacks[name] = callbacks[name] || noop;

			this.bind = wrapAndBindWithOffset(
				[
					['mousedown', startElem],
					['mousemove', stopElem],
					['mouseup', stopElem],

					['touchstart', startElem],
					['touchmove', stopElem],
					['touchend', stopElem],
					['touchcancel', stopElem],

					['wheel', startElem],
					['mousemove', startElem, this.mousemove_hover],
					['mouseleave', leaveElem],
				],
				offsetElem,
				this,
			);

			this.wheelDeltaMode2pixels = [];
			this.wheelDeltaMode2pixels[WheelEvent.DOM_DELTA_PIXEL] = 1;
			this.wheelDeltaMode2pixels[WheelEvent.DOM_DELTA_LINE] = 20;
			this.wheelDeltaMode2pixels[WheelEvent.DOM_DELTA_PAGE] = 50; // а это вообще как?
		}

		connect() {
			this._addListeners(
				'mousedown',
				'touchstart',
				'wheel',
				'mousemove_hover',
				'mouseleave',
			);
		}
		disconnect() {
			this._removeListeners(...Object.keys(this.bind));
		}

		_findTouchById(id) {
			for (let i = 0; i < this.touches.length; i++)
				if (this.touches[i].id == id) return this.touches[i]
			return null
		}
		_addTouch(touch, dx, dy) {
			let t = Point.fromTouch(touch, dx, dy);
			this.touches.push(t);
			return t
		}
		_removeTouch(touch) {
			for (let i = 0; i < this.touches.length; i++)
				if (this.touches[i] === touch) {
					this.touches.splice(i, 1);
					break
				}
		}

		_addListeners(...funcNames) {
			// console.log('+ ' + funcNames.join(', '))
			for (let funcName of funcNames) {
				let { event, elem, func } = this.bind[funcName];
				elem.addEventListener(event, func, {
					capture: true,
					passive: false,
				});
			}
		}
		_removeListeners(...funcNames) {
			// console.log('- ' + funcNames.join(', '))
			for (let funcName of funcNames) {
				let { event, elem, func } = this.bind[funcName];
				elem.removeEventListener(event, func, { capture: true });
			}
		}

		mousedown(e, dx, dy) {
			if (e.button != 0) return false
			this._addListeners('mousemove', 'mouseup');
			this._removeListeners('mousemove_hover');
			this.mouse.update(e, dx, dy);
			return this.callbacks.singleDown(e, this.mouse, false)
		}

		mousemove(e, dx, dy) {
			this.mouse.update(e, dx, dy);
			return this.callbacks.singleMove(e, this.mouse, false)
		}

		mouseup(e, dx, dy) {
			if (e.button != 0) return false
			this._removeListeners('mousemove', 'mouseup');
			this._addListeners('mousemove_hover');
			return this.callbacks.singleUp(e, this.mouse, false)
		}

		touchstart(e, dx, dy) {
			let count = this.touches.length;
			if (count == 2) return false

			if (count == 0) {
				this._addListeners('touchmove', 'touchend', 'touchcancel');
			}

			if (count == 0 && e.changedTouches.length == 1) {
				let point = this._addTouch(e.changedTouches[0], dx, dy);
				return this.callbacks.singleDown(e, point, false)
			}
			if (count == 0 && e.changedTouches.length >= 2) {
				let point0 = this._addTouch(e.changedTouches[0], dx, dy);
				let point1 = this._addTouch(e.changedTouches[1], dx, dy);
				return this.callbacks.doubleDown(e, point0, point1, false)
			}
			if (count == 1) {
				let point0 = this.touches[0];
				let point1 = this._addTouch(e.changedTouches[0], dx, dy);
				let prevent = this.callbacks.singleUp(e, point0, true);
				prevent += this.callbacks.doubleDown(e, point0, point1, true);
				return !!prevent
			}
		}

		touchmove(e, dx, dy) {
			for (let touch of e.changedTouches) {
				let point = this._findTouchById(touch.identifier);
				if (point !== null) point.update(touch, dx, dy);
			}
			let count = this.touches.length;
			if (count == 1) {
				return this.callbacks.singleMove(e, this.touches[0])
			}
			if (count == 2) {
				return this.callbacks.doubleMove(e, this.touches[0], this.touches[1])
			}
		}

		touchend(e, dx, dy) {
			let releasedTouches = [];
			for (let touch of e.changedTouches) {
				let point = this._findTouchById(touch.identifier);
				if (point !== null) releasedTouches.push(point);
			}

			let count = this.touches.length;
			if (count == releasedTouches.length) {
				this._removeListeners('touchmove', 'touchend', 'touchcancel');
			}

			if (count == 1) {
				return this.callbacks.singleUp(e, this.touches.pop(), false)
			}
			if (count == 2 && releasedTouches.length == 2) {
				let point1 = this.touches.pop();
				let point0 = this.touches.pop();
				return this.callbacks.doubleUp(e, point0, point1, false)
			}
			if (count == 2 && releasedTouches.length == 1) {
				let prevent = this.callbacks.doubleUp(
					e,
					this.touches[0],
					this.touches[1],
					true,
				);
				this._removeTouch(releasedTouches[0]);
				prevent += this.callbacks.singleDown(e, this.touches[0], true);
				return !!prevent
			}
		}

		touchcancel(e, dx, dy) {
			this.touchend(e, dx, dy);
		}

		wheel(e, dx, dy) {
			let k = this.wheelDeltaMode2pixels[e.deltaMode];
			let delta = { x: e.deltaX * k, y: e.deltaY * k, z: e.deltaZ * k };
			return this.callbacks.wheelRot(e, delta, this.mouse)
		}

		mousemove_hover(e, dx, dy) {
			this.mouse.update(e, dx, dy);
			return this.callbacks.singleHover(e, this.mouse)
		}

		mouseleave(e, dx, dy) {
			this.mouse.update(e, dx, dy);
			return this.callbacks.singleLeave(e, this.mouse)
		}
	}

	class HChartView {
		constructor({ xPosFrom = 0, xPosTo = 1, minPosWidth = 0, xPosMin = 0, xPosMax = 1 }) {
			this.xPosFrom = xPosFrom;
			this.xPosTo = xPosTo;
			this.minPosWidth = minPosWidth;
			this.xPosMin = xPosMin;
			this.xPosMax = xPosMax;
		}

		get xRealPosFrom() {
			return this.xPosFrom
		}
		get xRealPosTo() {
			return this.xPosTo
		}

		xToPos(x, width) {
			return (x * (this.xPosTo - this.xPosFrom)) / width
		}

		posToInner(pos, clamp = false) {
			pos = (pos - this.xPosFrom) / (this.xPosTo - this.xPosFrom);
			if (clamp) {
				if (pos < this.xPosMin) pos = this.xPosMin;
				if (pos > this.xPosMax) pos = this.xPosMax;
			}
			return pos
		}
		posFromInner(pos, clamp = false) {
			pos = (this.xPosTo - this.xPosFrom) * pos + this.xPosFrom;
			if (clamp) {
				if (pos < this.xPosMin) pos = this.xPosMin;
				if (pos > this.xPosMax) pos = this.xPosMax;
			}
			return pos
		}

		_clamp(hintLeft, hintRight) {
			let delta = this.xPosTo - this.xPosFrom - this.minPosWidth;
			if (delta < 0) {
				if (hintLeft == 0) this.xPosTo -= delta;
				else if (hintRight == 0) this.xPosFrom += delta;
				else {
					this.xPosTo -= delta / 2;
					this.xPosFrom += delta / 2;
				}
			}
			if (this.xPosFrom < this.xPosMin) {
				if (hintRight != 0) this.xPosTo -= this.xPosFrom - this.xPosMin;
				this.xPosFrom = this.xPosMin;
			}
			if (this.xPosTo > this.xPosMax) {
				if (hintLeft != 0) this.xPosFrom -= this.xPosTo - this.xPosMax;
				this.xPosTo = this.xPosMax;
			}
			if (this.xPosFrom < this.xPosMin) this.xPosFrom = this.xPosMin;
		}

		move(dPosLeft, dPosRight) {
			this.xPosFrom += dPosLeft;
			this.xPosTo += dPosRight;
			this._clamp(dPosLeft, dPosRight);
			this.changedSinceUpdate = true;
		}

		scale(xPos, delta) {
			let minDelta = this.minPosWidth / (this.xPosTo - this.xPosFrom);
			delta = Math.max(delta, minDelta);
			let leftOffset = xPos - this.xPosFrom;
			let rightOffset = this.xPosTo - xPos;
			this.xPosFrom = xPos - leftOffset * delta;
			this.xPosTo = xPos + rightOffset * delta;
			this._clamp(0, 0);
			this.changedSinceUpdate = true;
		}

		setLimits(xPosMin, xPosMax) {
			if (xPosMin !== null) this.xPosMin = xPosMin;
			if (xPosMax !== null) this.xPosMax = xPosMax;
			this._clamp(0, 0);
		}

		copy() {
			return new this.constructor(this)
		}

		copyPosTo(view) {
			view.xPosFrom = this.xPosFrom;
			view.xPosTo = this.xPosTo;
		}
	}

	class HChartSmoothedView {
		constructor({ xPosFrom = 0, xPosTo = 1, minPosWidth = 0.1 }) {
			this.cur = new HChartView({ xPosFrom, xPosTo, minPosWidth });
			this.dest = new HChartView({ xPosFrom, xPosTo, minPosWidth });
			this.speed = 0.75;
			this.framesWithoutSet = 0;
			this.maxFramesWithoutSet = 1;
		}

		_delta() {
			return (
				Math.abs(this.cur.xPosFrom - this.dest.xPosFrom) +
				Math.abs(this.cur.xPosTo - this.dest.xPosTo)
			)
		}

		get xPosFrom() {
			return this.cur.xPosFrom
		}
		get xPosTo() {
			return this.cur.xPosTo
		}
		get xRealPosFrom() {
			return this.dest.xPosFrom
		}
		get xRealPosTo() {
			return this.dest.xPosTo
		}

		posToInner(pos, clamp = false) {
			return this.cur.posToInner(pos, clamp)
		}
		posFromInner(pos, clamp = false) {
			return this.cur.posFromInner(pos, clamp)
		}

		xToPos(x, width) {
			return this.cur.xToPos(x, width)
		}

		move(dPosLeft, dPosRight) {
			this.dest.move(dPosLeft, dPosRight);
			this.framesWithoutSet = 0;
		}

		scale(xPos, delta) {
			this.dest.scale(xPos, delta);
			this.framesWithoutSet = 0;
		}

		setLimits(xPosMin, xPosMax) {
			this.dest.setLimits(xPosMin, xPosMax);
		}

		sync() {
			this.cur.xPosFrom = this.dest.xPosFrom;
			this.cur.xPosTo = this.dest.xPosTo;
		}

		copy() {
			return this.cur.copy()
		}

		copyPosTo(view) {
			return this.cur.copyPosTo(view)
		}

		update() {
			if (this.framesWithoutSet < this.maxFramesWithoutSet) {
				let k = this.speed;
				let k1 = 1 - k;
				this.cur.xPosFrom = this.cur.xPosFrom * k1 + this.dest.xPosFrom * k;
				this.cur.xPosTo = this.cur.xPosTo * k1 + this.dest.xPosTo * k;
			} else {
				this.dest.copyPosTo(this.cur);
			}
			this.framesWithoutSet += 1;
		}

		finished() {
			return (
				this.cur.xPosFrom == this.dest.xPosFrom && this.cur.xPosTo == this.dest.xPosTo
			)
		}
	}

	class CanvasExt {
		constructor(canvas) {
			this.canvas = canvas;
			this.rc = this.canvas.getContext('2d');
			this.pixelRatio = 1;
			this.pixelRatioCoeff = 1;
			this.cssWidth = this.canvas.width;
			this.cssHeight = this.canvas.height;
		}
		setPixelRatioCoeff(k) {
			if (this.pixelRatioCoeff != k) {
				this.pixelRatioCoeff = k;
				this.resize();
				return true
			}
			return false
		}
		_setRealSize(w, h) {
			if (this.canvas.width == w && this.canvas.height == h) return false
			this.canvas.width = w;
			this.canvas.height = h;
			return true
		}
		resize() {
			let { width: cssWidth, height: cssHeight } = this.canvas.getBoundingClientRect();
			this.pixelRatio = window.devicePixelRatio * this.pixelRatioCoeff;
			this.cssWidth = cssWidth;
			this.cssHeight = cssHeight;
			let width = Math.floor(this.cssWidth * this.pixelRatio + 0.249);
			let height = Math.floor(this.cssHeight * this.pixelRatio + 0.249);
			return this._setRealSize(width, height)
		}
		clear() {
			this.rc.clearRect(0, 0, this.canvas.width, this.canvas.height);
		}
	}

	function getSign(v) {
		return v < 0 ? -1 : v > 0 ? 1 : 0
	}

	class AnimatedSpeedLimit {
		constructor({ value, accelK = 0.02 }) {
			this.value = value;
			this.valueDest = value;
			this.accelK = accelK;
			this.speed = 0;
			this.fullDelta = 0;
			this.finishedOnLastUpdate = false;
			this.speedCoeff = 1;
		}
		setDest(newValue) {
			let sign = getSign(this.valueDest - this.value);
			let prevValue = this.valueDest - this.fullDelta * sign;
			this.fullDelta = Math.max(this.fullDelta, Math.abs(prevValue - newValue));
			this.valueDest = newValue;
		}
		resetTo(newValue) {
			this.valueDest = this.value = newValue;
			this.fullDelta = 0;
			this.speed = 0;
		}
		update(speedup = 1) {
			if (this.value != this.valueDest) {
				let sign = getSign(this.valueDest - this.value);
				let remainDelta = Math.abs(this.valueDest - this.value);
				//if (remainDelta > this.fullDelta) console.error(remainDelta, this.fullDelta, this.speed)
				let fullDelta = Math.max(remainDelta, this.fullDelta);
				let passedDelta = fullDelta - remainDelta;
				let isAccelPhase = remainDelta > fullDelta / 2;

				let accel = fullDelta * this.accelK;
				let destSpeed = isAccelPhase
					? Math.sqrt(2 * (passedDelta + fullDelta * 0.001) * accel) * sign
					: Math.sqrt(2 * (remainDelta + fullDelta * 0.001) * accel) * sign;

				this.speed += (destSpeed - this.speed) * 1;

				let adjSpeed = this.speed * speedup * this.speedCoeff;
				if (Math.abs(adjSpeed) > remainDelta) {
					this.resetTo(this.valueDest);
				} else {
					this.value += adjSpeed;
				}

				this.finishedOnLastUpdate = true;
				return true
			} else {
				this.finishedOnLastUpdate = false;
			}
			return false
		}
		// Закончилась ли анимация.
		finished() {
			return this.value == this.valueDest
		}
		// Неподвижна ли анимация (закончилась больше одного апдейта назад).
		still() {
			return !this.finishedOnLastUpdate && this.value == this.valueDest
		}
	}

	class AnimatedSpeedRange {
		constructor({ valueFrom, valueTo }) {
			this.limitFrom = new AnimatedSpeedLimit({ value: valueFrom });
			this.limitTo = new AnimatedSpeedLimit({ value: valueTo });
			this.speedCoeff = 1;
		}
		get speedCoeff() {
			return this.limitFrom.speedCoeff
		}
		set speedCoeff(v) {
			this.limitFrom.speedCoeff = v;
			this.limitTo.speedCoeff = v;
		}
		get valueFrom() {
			return this.limitFrom.value
		}
		get valueFromDest() {
			return this.limitFrom.valueDest
		}
		get valueTo() {
			return this.limitTo.value
		}
		get valueToDest() {
			return this.limitTo.valueDest
		}
		set valueFrom(v) {
			throw new Error('must not set "valueFrom" directly')
		}
		set valueFromDest(v) {
			throw new Error('must not set "valueFromDest" directly')
		}
		set valueTo(v) {
			throw new Error('must not set "valueTo" directly')
		}
		set valueToDest(v) {
			throw new Error('must not set "valueToDest" directly')
		}
		setDest(newValueFrom, newValueTo) {
			if (this.limitTo.valueDest == 0 && newValueTo != 0) {
				this.resetTo(newValueFrom, newValueTo);
			} else {
				this.limitFrom.setDest(newValueFrom);
				this.limitTo.setDest(newValueTo);
			}
		}
		resetTo(newValueFrom, newValueTo) {
			this.limitFrom.resetTo(newValueFrom);
			this.limitTo.resetTo(newValueTo);
		}
		update(speedup = 1) {
			if (this.finished()) return false
			this.limitFrom.update(speedup);
			this.limitTo.update(speedup);
			return true
		}
		finished() {
			return (
				(this.limitFrom.finished() && this.limitTo.finished()) ||
				this.limitTo.valueDest == 0
			)
		}
		getPos(value) {
			return (
				(value - this.limitFrom.value) / (this.limitTo.value - this.limitFrom.value)
			)
		}
		copy() {
			return new this.constructor(this)
		}
	}

	class Rect {
		constructor({ left, top, width, height }) {
			this.left = left;
			this.top = top;
			this.width = width;
			this.height = height;
		}
	}

	class RectBottom {
		constructor({ left, right, bottom, height }) {
			this.left = left;
			this.right = right;
			this.top = 0;
			this.bottom = bottom;
			this.width = 0;
			this.height = height;
		}

		update(outerWidth, outerHeight) {
			this.width = outerWidth - this.left - this.right;
			this.top = outerHeight - this.bottom - this.height;
		}
	}

	class RectTop {
		constructor({ left, right, top, height }) {
			this.left = left;
			this.right = right;
			this.top = top;
			this.bottom = 0;
			this.width = 0;
			this.height = height;
		}

		update(outerWidth, outerHeight) {
			this.width = outerWidth - this.left - this.right;
			this.bottom = outerHeight - this.top - this.height;
		}
	}

	function getIndexFromPosBinary(pos, xValues, indexFrom = 0, indexTo = null) {
		if (indexTo === null) indexTo = xValues.length;
		let xLeft = xValues[indexFrom];
		let xRight = xValues[indexTo - 1];
		let x = xLeft + (xRight - xLeft) * pos;
		return getIndexBinary(x, xValues, indexFrom, indexTo)
	}

	function getIndexBinary(x, xValues, indexFrom, indexTo) {
		while (indexFrom < indexTo - 1) {
			let indexMid = (indexFrom + indexTo) >> 1;
			if (x < xValues[indexMid]) {
				indexTo = indexMid;
			} else {
				indexFrom = indexMid;
			}
		}
		return indexFrom
	}

	function appendElem(wrap, tagName, classNames = [], style = {}) {
		let elem = document.createElement(tagName);
		for (let name of classNames) elem.classList.add(name);
		for (let name in style) elem.style[name] = style[name];
		wrap.appendChild(elem);
		return elem
	}

	function bindMethods(obj, prefix) {
		let res = {};
		Object.getOwnPropertyNames(obj.constructor.prototype).forEach(name => {
			if (name.startsWith(prefix)) res[name.slice(prefix.length)] = obj[name].bind(obj);
		});
		return res
	}

	function roundedRectLeft(rc, x, y, h, r) {
		rc.lineTo(x + r, y + h);
		rc.arcTo(x, y + h, x, y + h - r, r);
		rc.lineTo(x, y + y + r);
		rc.arcTo(x, y, x + r, y, r);
	}

	function roundedRectRight(rc, x, y, h, r) {
		rc.lineTo(x - r, y);
		rc.arcTo(x, y, x, y + r, r);
		rc.lineTo(x, y + h - r);
		rc.arcTo(x, y + h, x - r, y + h, r);
	}

	function roundedRect(rc, x, y, w, h, r) {
		rc.moveTo(x + w - r, y + h);
		roundedRectLeft(rc, x, y, h, r);
		roundedRectRight(rc, x + w, y, h, r);
	}

	function elemIsInTree(elem, root) {
		while (elem) {
			if (elem === root) return true
			elem = elem.parentElement;
		}
		return false
	}
	function changeValueAnimatedFixed(lel, el, p, c, prevCallDelta, params = {}) {
		let minPauseToAnimate = 400;
		if (p == c) return
		if (p && p != c && prevCallDelta > minPauseToAnimate)
			setAnimatedNewValueTo(lel, el, p, c, params);
		else params.isHTML ? (lel.innerHTML = c) : (lel.textContent = c);
	}
	let setAnimatedNewValueTo = function(lel, el, p, c, { isHTML = false }) {
		let isWidthFixNeeded = ('' + p).length > ('' + c).length;
		if (isWidthFixNeeded) el.style.width = el.offsetWidth + 'px';
		isHTML ? (lel.innerHTML = c) : (lel.textContent = c);
		let fadeEl = appendElem(el, 'span', ['ae-come-out']);
		isHTML ? (fadeEl.innerHTML = p) : (fadeEl.textContent = p);

		lel.classList.remove('ae-come-in');
		lel.offsetWidth;
		lel.classList.add('ae-come-in');

		fadeEl.addEventListener('animationend', function(e) {
			if (!this.parentElement) return
			this.parentElement.removeChild(e.target);
			if (isWidthFixNeeded) el.style.width = '';
		});
	};
	function throttle(func, ms) {
		let isThrottled = false,
			savedArgs,
			savedThis;
		function wrapper() {
			if (isThrottled) {
				savedArgs = arguments;
				savedThis = this;
				return
			}
			func.apply(this, arguments);
			isThrottled = true;
			setTimeout(function() {
				isThrottled = false;
				if (savedArgs) {
					wrapper.apply(savedThis, savedArgs);
					savedArgs = savedThis = null;
				}
			}, ms);
		}
		return wrapper
	}

	// Модуль-график.
	// Основная часть графика, занимается подготовкой канваса к отрисовке.
	// Содержимое графика должна отрисовать drawFunc.
	class ChartModule {
		constructor({ wrap, canvasExt, drawFunc, view, rect }) {
			this.wrap = wrap;
			this.canvasExt = canvasExt;
			this.drawFunc = drawFunc;
			this.rc = canvasExt.rc;
			this.view = view;
			this.rect = rect;
			this.shouldClearBottom = true;
		}

		connect(core) { }
		disconnect() { }

		resize() {
			this.rect.update(this.canvasExt.cssWidth, this.canvasExt.cssHeight);
		}

		redraw() {
			let { left, right, top, width, height } = this.rect;
			this.rc.save();
			this.rc.scale(this.canvasExt.pixelRatio, -this.canvasExt.pixelRatio);
			this.rc.translate(left, -top - height);
			this.rc.clearRect(-left, -15, width + left + right, height + top + 15);
			this.drawFunc(this.rc, this.view);
			if (this.shouldClearBottom)
				this.rc.clearRect(-left, -8, width + left + right, 6);
			this.rc.restore();
		}

		xToPos(x) {
			return this.view.xToPos(x, this.rect.width)
		}

		canvasXToPos(x) {
			return this.view.xPosFrom + this.view.xToPos(x - this.rect.left, this.rect.width)
		}

		getOuterPos() {
			return {
				xPosFrom: this.view.xPosFrom - this.xToPos(this.rect.left),
				xPosTo: this.view.xPosTo + this.xToPos(this.rect.right),
			}
		}
		showChartMessageWithDelay(text, delay) {
			clearTimeout(this.messageTimeout);
			this.messageTimeout = setTimeout(() => {
				this.wrap.dataset.messageText = text;
				this.messageTimeout = setTimeout(() => this.hideChartMessage(), 2000);
			}, delay);
		}
		showChartMessage(text) {
			clearTimeout(this.messageTimeout);
			this.wrap.dataset.messageText = text;
			this.messageTimeout = setTimeout(() => this.hideChartMessage(), 2000);
		}
		hideChartMessage() {
			clearTimeout(this.messageTimeout);
			delete this.wrap.dataset.messageText;
		}
		toggleBottomClear(on) {
			this.shouldClearBottom = on;
		}
	}

	// Модуль для управления основной части графика мышкой/тачами.
	// Поддерживает 1-2 одновременых касания, вызывает наружние колбеки:
	// onGrab - захват области мышкой/тачами
	// onMove - перемешение по горизонтали мышкой/одним пальцем
	// onRelease - отпусание области
	// onZoom - масштабирование колёсиком/двумя пальцами
	// onHover - движение мышки (без нажатия) над областью
	// onLeave - выход мышки из области
	// onClick - клик мышкой по области
	class ChartControlModule {
		constructor({ eventsElem, leaveElem, callbacks, chartModule }) {
			this.eventsElem = eventsElem;
			this.leaveElem = leaveElem;
			this.prevX = 0;
			this.prevY = 0;
			this.totalMoveDist = 0;
			this.prevDist = 0;
			this.callbacks = callbacks;
			this.chartModule = chartModule;
			this.control = new ControlDouble({
				startElem: eventsElem,
				leaveElem: leaveElem,
				callbacks: bindMethods(this, '_on_'),
			});
			// костыль для игнорирования костыля, кидающего мышиные евенты нажатия-отпускания вслед за коротким тачем
			this.lastTouchAt = 0;
			// костыль для игнорирования тачей во время скролла
			this.isScrolling = false;
			addEventListener('scroll', () => this._on_scroll());
		}

		connect(core) {
			this.control.connect();
		}
		disconnect() {
			this.control.disconnect();
		}
		resize() { }
		redraw() { }

		xToPos(x) {
			return this.chartModule.xToPos(x)
		}

		_on_scroll(e) {
			this.isScrolling = true;
			clearTimeout(this.scrollTimeout);
			this.scrollTimeout = setTimeout(() => {
				this.isScrolling = false;
				clearTimeout(this.scrollTimeout);
			}, 200);
		}
		_isMovingForALongTime() {
			let newStamp = Date.now();
			let isMovingForALongTime = !!this.moveLongTimeout;
			if(this.lastTouchAt && newStamp - 200 > this.lastTouchAt){
				clearTimeout(this.moveLongTimeout);
				this.moveLongTimeout = setTimeout(() => {
					this.isMovingForALongTime = false;
					clearTimeout(this.moveLongTimeout);
					this.moveLongTimeout = null;
				}, 200);
			}
			return isMovingForALongTime
		}
		_on_singleDown(e, point, isSwitching) {
			if (point.id == 'mouse') {
				if (Date.now() - this.lastTouchAt < 500) return false
				this.prevX = point.x;
				this.prevY = point.y;
				this.totalMoveDist = 0;
				this.eventsElem.style.cursor = 'grabbing';
				this.callbacks.onGrab();
				return true
			} else {
				if (this.isScrolling) return
				this.lastTouchAt = Date.now();
				if (!isSwitching) this.callbacks.onHover(point.x, point.y);
				return false
			}
		}

		_on_singleMove(e, point) {
			if (point.id == 'mouse') {
				this.callbacks.onMove(this.xToPos(this.prevX - point.x));
				this.totalMoveDist += point.distanceFromXY(this.prevX, this.prevY);
				this.prevX = point.x;
				this.prevY = point.y;
				return true
			} else {
				if (this.isScrolling) return
				if (this._isMovingForALongTime()) e.preventDefault();
				this.callbacks.onHover(point.x, point.y);
				return false
			}
		}

		_on_singleUp(e, point, isSwitching) {
			if (point.id == 'mouse') {
				if (Date.now() - this.lastTouchAt < 500) return false
				this.eventsElem.style.cursor = '';
				if (this.totalMoveDist < 3) this.callbacks.onClick(point);
				this.callbacks.onRelease();
				return true
			} else {
				this.lastTouchAt = Date.now();
				return false
			}
		}

		_on_doubleDown(e, point0, point1, isSwitching) {
			this.prevX = (point0.x + point1.x) / 2;
			this.prevDist = point0.distanceFrom(point1);
			this.callbacks.onGrab();
			return true
		}

		_on_doubleMove(e, point0, point1) {
			let curX = (point0.x + point1.x) / 2;
			let curDist = Math.max(point0.distanceFrom(point1), 0.1);
			this.callbacks.onZoom(
				this.prevDist / curDist,
				this.chartModule.canvasXToPos(curX),
			);
			this.callbacks.onMove(this.xToPos(this.prevX - curX));
			this.prevX = curX;
			this.prevDist = curDist;
			return true
		}

		_on_doubleUp(e, point0, point1, isSwitching) {
			this.callbacks.onRelease();
			return true
		}

		_on_wheelRot(e, delta, point) {
			if (e.ctrlKey) {
				this.callbacks.onZoom(
					Math.pow(2, delta.y / 1000),
					this.chartModule.canvasXToPos(point.x),
				);
				this.callbacks.onMove(this.xToPos(-delta.x / 5));
				return true
			} else {
				return false
			}
		}

		_on_singleHover(e, point) {
			this.callbacks.onHover(point.x, point.y);
			return false
		}
		_on_singleLeave(e, point) {
			if (!elemIsInTree(e.relatedTarget, this.leaveElem))
				this.callbacks.onLeave(point.x, point.y);
			return false
		}
	}

	// Модуль-миникарта.
	// Отображает весь график целиком в уменьшенном виде, рисует рамку поверх.
	// Сам же занимает перемещением рамки от мышки/тачей.
	// Содержимое графика должна отрисовать drawFunc.
	class MinimapModule {
		constructor({ canvasExt, eventsElem, frameConfig, drawFunc, view, rect, callbacks }) {
			this.eventsElem = eventsElem;
			this.canvasExt = canvasExt;
			this.drawFunc = drawFunc;
			this.view = view;
			this.outerView = new HChartView({});
			this.prevView = view.copy();
			this.rect = rect;
			this.callbacks = callbacks;
			this.control = new ControlDouble({
				startElem: this.eventsElem,
				offsetElem: canvasExt.canvas,
				callbacks: bindMethods(this, '_on_'),
			});
			this.theme = 'day';
			this.frame = {
				hThick: frameConfig.hThick,
				vThick: frameConfig.vThick,
				interactionXOffset: frameConfig.interactionXOffset,
				color: frameConfig.color,
				abroadColors: frameConfig.abroadColors,
			};
			this.grab = { left: null, right: null, middle: null };
			this.gotMassChange = true;
		}

		connect(core) {
			this.control.connect();
		}

		disconnect() {
			this.control.disconnect();
		}

		resize() {
			this.rect.update(this.canvasExt.cssWidth, this.canvasExt.cssHeight);
			this.gotMassChange = true;
		}

		redraw() {
			let w = this.rect.width;
			let frameXFrom = w * this.outerView.posToInner(this.view.xPosFrom, true);
			let frameXTo = w * this.outerView.posToInner(this.view.xPosTo, true);
			let frameVThick = this.frame.vThick;

			let prevFrameXFrom = w * this.prevView.xPosFrom;
			let prevFrameXTo = w * this.prevView.xPosTo;
			let leftRedrawXFrom = Math.min(frameXFrom, prevFrameXFrom) - 1;
			let leftRedrawXTo = Math.max(frameXFrom, prevFrameXFrom) + 1 + frameVThick;
			let rightRedrawXFrom = Math.min(frameXTo, prevFrameXTo) - 1 - frameVThick;
			let rightRedrawXTo = Math.max(frameXTo, prevFrameXTo) + 1;

			let startMoved = frameXFrom != prevFrameXFrom;
			let endMoved = frameXTo != prevFrameXTo;

			if (this.gotMassChange) {
				// если обновилось что-то глобмально, перерисовываем всё целиком
				this.gotMassChange = false;
				this.redrawInterval(0, this.rect.width);
			} else if (startMoved && endMoved && leftRedrawXTo + 32 > rightRedrawXFrom) {
				// если сдвинулись и начало, и конец, и они рядом, перерисовываем оба конца вместе
				this.redrawInterval(leftRedrawXFrom, rightRedrawXTo);
			} else {
				// перерисовываем концы рамки поотдельности
				if (startMoved) this.redrawInterval(leftRedrawXFrom, leftRedrawXTo);
				if (endMoved) this.redrawInterval(rightRedrawXFrom, rightRedrawXTo);
			}

			//this.view.copyPosTo(this.prevView)
			this.prevView.xPosFrom = frameXFrom / w;
			this.prevView.xPosTo = frameXTo / w;
		}

		redrawInterval(xFrom, xTo) {
			let rc = this.canvasExt.rc;
			rc.save();

			let w = this.rect.width;
			let h = this.rect.height;
			let frameXFrom = w * this.outerView.posToInner(this.view.xPosFrom, true);
			let frameXTo = w * this.outerView.posToInner(this.view.xPosTo, true);
			let frameHThick = this.frame.hThick;
			let frameVThick = this.frame.vThick;
			let frameHSep = 0;
			let frameHOffset = frameHSep + frameHThick;
			let frameW = frameXTo - frameXFrom;
			let frameH = h + frameHOffset * 2;
			let frameInnerH = h + frameHSep * 2;

			let ratio = this.canvasExt.pixelRatio;
			// реальные (в реальных пикселах) координаты
			let realXFrom = Math.floor((xFrom + this.rect.left) * ratio);
			let realYFrom = Math.floor((this.rect.top - frameHOffset) * ratio);
			let realW = Math.ceil((xTo - xFrom) * ratio);
			let realH = Math.ceil((h + frameHOffset * 2) * ratio);

			xFrom = realXFrom / ratio - this.rect.left;
			xTo = (realXFrom + realW) / ratio - this.rect.left;

			let rect = new Rect({
				left: xFrom,
				width: xTo - xFrom,
				height: this.rect.height,
			});
			let view = new HChartView({
				xPosFrom: this.outerView.posFromInner((xFrom - 1) / (w - 2), true),
				xPosTo: this.outerView.posFromInner((xTo - 1) / (w - 2), true),
			});

			// очищаем и клипаем строго по хардварным пикселам, чтоб не было артефактов из-за полуобрезанных точек
			rc.beginPath();
			rc.rect(realXFrom, realYFrom, realW, realH);
			rc.clip();
			rc.clearRect(realXFrom, realYFrom, realW, realH);

			// рисуем кусочек миникарты
			rc.scale(this.canvasExt.pixelRatio, this.canvasExt.pixelRatio);
			rc.translate(this.rect.left + xFrom, this.rect.top + this.rect.height);
			rc.scale(1, -1);
			this.drawFunc(rc, view, rect);
			rc.translate(-xFrom, 0);

			// рисуем зетемнённые области слева и справа
			rc.fillStyle = this.frame.abroadColors[this.theme];
			if (xFrom < frameXFrom)
				rc.fillRect(xFrom, -0.5, frameXFrom - xFrom + frameVThick / 2, h + 1);
			if (xTo > frameXTo)
				rc.fillRect(xTo, -0.5, frameXTo - xTo - frameVThick / 2, h + 1);

			// скругление задней рамки (прорисока дырок на углах слева и справа)
			let foreignR = frameVThick / 1.5;
			let shouldReRoundLeft = xFrom < foreignR;
			let shouldReRoundRight = xTo > w - foreignR;
			if (shouldReRoundLeft || shouldReRoundRight) {
				rc.beginPath();
				if (shouldReRoundLeft) {
					rc.moveTo(-2, -w);
					rc.lineTo(-2, h + w);
					roundedRectLeft(rc, 1, -0.5, h + 1, foreignR);
				}
				if (shouldReRoundRight) {
					rc.moveTo(w + 2, h + 2);
					rc.lineTo(w + 2, -2);
					roundedRectRight(rc, w - 1, -0.5, h + 1, foreignR);
				}
				rc.fillStyle = 'black';
				rc.globalCompositeOperation = 'destination-out';
				rc.fill();
				rc.globalCompositeOperation = 'source-over';
			}

			// рисуем собственно рамку
			rc.beginPath();
			let frameR = frameVThick / 1.5;
			roundedRect(rc, frameXFrom, -frameHOffset, frameW, frameH, frameR);
			rc.rect(
				frameXFrom + frameVThick,
				-frameHSep,
				frameW - frameVThick * 2,
				frameInnerH,
			);
			rc.fillStyle = this.frame.color[this.theme];
			rc.fill('evenodd');

			// рисуем полосочки на краях рамки
			rc.beginPath();
			rc.moveTo(frameXFrom + frameVThick / 2, h / 2 - 4.5);
			rc.lineTo(frameXFrom + frameVThick / 2, h / 2 + 4.5);
			rc.moveTo(frameXTo - frameVThick / 2, h / 2 - 4.5);
			rc.lineTo(frameXTo - frameVThick / 2, h / 2 + 4.5);
			rc.lineCap = 'round';
			rc.lineWidth = 2;
			rc.strokeStyle = 'white';
			rc.stroke();

			rc.restore();
		}

		getFrameWidth() {
			return (
				this.rect.width *
				(this.outerView.posToInner(this.view.xRealPosTo) -
					this.outerView.posToInner(this.view.xRealPosFrom))
			)
		}

		xToPos(x) {
			return (x / this.rect.width) * (this.outerView.xPosTo - this.outerView.xPosFrom)
		}
		canvasXToPos(x) {
			return this.xToPos(x - this.rect.left)
		}
		canvasXToFrame(x) {
			return (
				x -
				this.rect.left -
				this.rect.width * this.outerView.posToInner(this.view.xRealPosFrom)
			)
		}

		getGrabDPos(grab) {
			return this.xToPos(this.canvasXToFrame(grab.point.x) - grab.frameX)
		}

		tryGrab(point) {
			let w = this.getFrameWidth();
			let x = this.canvasXToFrame(point.x);
			let g = this.grab;
			let { outer, inner } = this.frame.interactionXOffset;
			inner = Math.min(inner, w / 2);
			if (!g.left && x > -outer && x < inner) {
				g.left = { frameX: x, point };
				return true
			} else if (!g.right && x > w - inner && x < w + outer) {
				g.right = { frameX: x - w, point };
				return true
			} else if (!g.middle && !g.left && !g.right && x > 0 && x < w) {
				g.middle = { frameX: x, point };
				return true
			}
			return false
		}

		tryMoveGrabbed() {
			if (this.grab.left) {
				this.callbacks.onMove(this.getGrabDPos(this.grab.left), 0);
			}
			if (this.grab.right) {
				let w = this.getFrameWidth();
				let dPos = this.getGrabDPos(this.grab.right) - this.xToPos(w);
				this.callbacks.onMove(0, dPos);
			}
			if (this.grab.middle) {
				this.callbacks.onMove(this.getGrabDPos(this.grab.middle));
			}
			return this.grab.left || this.grab.right || this.grab.middle
		}

		releaseGrabbed(point) {
			let smthWasGrabbed = this.grab.left || this.grab.right || this.grab.middle;
			for (let side in this.grab)
				if (this.grab[side] && this.grab[side].point === point) {
					this.grab[side] = null;
					break
				}
			return smthWasGrabbed
		}

		setCursor(value) {
			this.eventsElem.style.cursor = value;
		}

		updateGrabCursor() {
			let g = this.grab;
			if (g.middle) {
				this.setCursor('grabbing');
			} else if (g.left || g.right) {
				this.setCursor('col-resize');
			}
		}

		updateHoverCursor(point) {
			if (point.id != 'mouse') return
			let w = this.getFrameWidth();
			let x = this.canvasXToFrame(point.x);
			let g = this.grab;
			let { outer, inner } = this.frame.interactionXOffset;
			if (!g.left && x > -outer && x < inner) {
				this.setCursor('col-resize');
			} else if (!g.right && x > w - inner && x < w + outer) {
				this.setCursor('col-resize');
			} else if (!g.middle && !g.left && !g.right && x > 0 && x < w) {
				this.setCursor('grab');
			} else {
				this.setCursor('');
			}
		}

		_on_singleDown(e, point, isSwitching) {
			this.callbacks.onGrab();
			let grabbed = this.tryGrab(point);
			this.updateGrabCursor();
			return grabbed
		}

		_on_singleMove(e, point) {
			return this.tryMoveGrabbed()
		}

		_on_singleUp(e, point, isSwitching) {
			this.callbacks.onRelease();
			this.updateHoverCursor(point);
			return this.releaseGrabbed(point)
		}

		_on_doubleDown(e, point0, point1, isSwitching) {
			this.callbacks.onGrab();
			return !!(this.tryGrab(point0) + this.tryGrab(point1))
		}

		_on_doubleMove(e, point0, point1) {
			return this.tryMoveGrabbed()
		}

		_on_doubleUp(e, point0, point1, isSwitching) {
			this.callbacks.onRelease();
			return !!(this.releaseGrabbed(point0) + this.releaseGrabbed(point1))
		}

		_on_wheelRot(e, delta, point) {
			if (e.ctrlKey) {
				this.callbacks.onZoom(Math.pow(2, delta.y / 1000), this.canvasXToPos(point.x));
				return true
			} else {
				return false
			}
		}

		_on_singleHover(e, point) {
			this.updateHoverCursor(point);
			return false
		}

		_on_singleLeave(e, point) {
			return false
		}

		setTheme(theme) {
			this.theme = theme;
		}
		handleMassChange() {
			this.gotMassChange = true;
		}
	}

	class ChartHead {
		constructor({ wrap, theme, getEnds, locale, title, onRegionZoomOutClick, getZoomValue }) {
			this.wrap = wrap;
			this.onRegionZoomOutClick = onRegionZoomOutClick;
			this.title = title;
			this.locale = locale;
			this.getEnds = getEnds;
			this.getZoomValue = getZoomValue;
			wrap.classList.add('ae-flex-to-borders');
			this.spanWithVal = '<span class="ae-curr ae-span"></span>';
			let titleEl = appendElem(wrap, 'div', ['ae-to-left', 'ae-cud-wrap', 'ae-anim-to-left', 'ae-title']);
			let intervalEl = appendElem(wrap, 'div', ['ae-to-right', 'ae-cud-wrap', 'ae-interval-title']);

			titleEl.innerHTML = this.spanWithVal;
			intervalEl.innerHTML = this.spanWithVal;

			this.elemsHash = {
				main: {
					title: {
						el: titleEl, lel: titleEl.childNodes[0]
					},
					interval: {
						el: intervalEl, lel: intervalEl.childNodes[0]
					}
				}
			};
			this.setTheme(theme);
			this.setZoom(false, true);
			this.redrawBT = this.redraw.bind(this);
			this.redraw = throttle(this.redrawBT, 16 * 4);
			titleEl.addEventListener('click', () => this.isZoomIn ? this.onRegionZoomOutClick() : '');
		}
		setZoom(isZoomIn, isNoAnimation) {
			if (isZoomIn == this.isZoomIn) return
			this.isZoomIn = isZoomIn;
			let eh = this.elemsHash;
			let meh = eh.main;
			let oldTitleHTML = meh.title.lel.innerHTML;
			let newTitleHTML = this.genTitleHTML(isZoomIn);
			changeValueAnimatedFixed(meh.title.lel, meh.title.el, oldTitleHTML, newTitleHTML, isNoAnimation ? 0 : 9001, { isHTML: true });
		}
		checkZoomToUpd() {
			if (this.isZoomIn == !!this.getZoomValue()) return
			if (this.getZoomValue() == 0) this.setZoom(false);
			if (this.getZoomValue() == 1) this.setZoom(true);
		}
		setIntervalMode(isDayMode) {
			if (isDayMode !== undefined && isDayMode == this.isDayMode) return
			let isNoAnimation = isDayMode === undefined;
			this.isDayMode = isDayMode;
			let eh = this.elemsHash;
			let meh = eh.main;
			let oldIntervalHTML = meh.interval.lel.innerHTML;
			let newIntervalHTML = this.genIntervalHTML(isDayMode);
			changeValueAnimatedFixed(meh.interval.lel, meh.interval.el, oldIntervalHTML, newIntervalHTML, isNoAnimation ? 0 : 9001, { isHTML: true });

			this.updateIntervalEh(isDayMode, meh.interval.lel);
		}
		genTitleHTML(isZoomIn) {
			return isZoomIn ?
				`<span class="ae-zoom-title" style="color:${DEFAULT_CONFIG.inlineAction[this.theme]}"><span class="ae-zoom-out-icon ae-icon"></span><label class="ae-label">${labels.zoomOut[this.locale]}</label></span>`
				: this.title
		}
		genIntervalHTML(isDayMode) {
			if (!isDayMode) {
				return `
				<span>
					<span class="ae-cud-wrap" data-dday>${this.spanWithVal}</span>
					<span class="ae-cud-wrap" data-month>${this.spanWithVal}</span>
					<span class="ae-cud-wrap" data-year>${this.spanWithVal}</span>
					<span class="ae-cud-wrap" data-separator>–</span>
					<span class="ae-cud-wrap" data-end-dday>${this.spanWithVal}</span>
					<span class="ae-cud-wrap" data-end-month>${this.spanWithVal}</span>
					<span class="ae-cud-wrap" data-end-year>${this.spanWithVal}</span>
				</span>
			`
			} else {
				return `
				<span>
					<span class="ae-cud-wrap" data-day>${this.spanWithVal}</span>
					<span class="ae-cud-wrap" data-month>${this.spanWithVal}</span>
					<span class="ae-cud-wrap" data-year>${this.spanWithVal}</span>
				</span>
			`
			}
		}
		updateIntervalEh(isZoomIn, lel) {
			this.elemsHash.intervalElems = {};
			let heh = this.elemsHash.intervalElems;
			let qs = lel.querySelector.bind(lel);
			heh.month = { el: qs('[data-month]') };
			heh.year = { el: qs('[data-year]') };
			if (isZoomIn) {
				heh.day = { el: qs('[data-day]') };
			} else {
				heh.dday = { el: qs('[data-dday]') };
				heh.endDday = { el: qs('[data-end-dday]') };
				heh.endMonth = { el: qs('[data-end-month]') };
				heh.endYear = { el: qs('[data-end-year]') };
			}
			for (let k in heh) {
				let h = heh[k];
				h.lel = h.el.childNodes[0];
			}
		}
		addElementWithSpace(el, type, classes) {
			let elem = appendElem(el, type, classes);
			el.appendChild(document.createComment(''));
			return elem
		}
		onChartSpeedupRequest(level) {
			this.isSpedupRequested = level >= 1;
			this.redraw = throttle(this.redrawBT, 16 * (level + 11));
		}
		connect() { }
		resize() { }
		redraw() {
			if (!this.elemsHash) return

			this.checkZoomToUpd(); //чтобы зумаут вызывался когда вызумливание закончилось
			if (this.getZoomValue() > 0 && this.getZoomValue() < 1) return //не пересчитывать дни во время анимации

			let ends = this.getEnds();
			let start_date = new Date(ends.start_dtime);
			let end_date = new Date(ends.end_dtime);
			let isDayMode = ends.end_dtime - ends.start_dtime < 25 * dateHour;
			this.setIntervalMode(isDayMode);

			let isSpedupRequested = this.isSpedupRequested;

			let eh = this.elemsHash.intervalElems;
			let v = {
				dday: start_date.getDate(),
				month: monthNames[this.locale][start_date.getMonth()],
				year: start_date.getFullYear(),
				endDday: end_date.getDate(),
				endMonth: monthNames[this.locale][end_date.getMonth()],
				endYear: end_date.getFullYear()
			};
			let currTime = Date.now();
			if (isDayMode) {
				let h = eh.day;
				let prevCallDelta = currTime - h.prevUpdateCallAt;
				let dayStr = `${dayNames[this.locale][start_date.getDay()]}, ${start_date.getDate()}`;
				let prevDayStr = eh.day.prev_day ? `${dayNames[this.locale][h.prev_day]}, ${h.prev_date}` : '';
				changeValueAnimatedFixed(h.lel, h.el, prevDayStr, dayStr, isSpedupRequested ? 0 : prevCallDelta);
				h.prev_day = start_date.getDay();
				h.prev_date = start_date.getDate();

				h = eh.month;
				let monthStr = monthNames[this.locale][start_date.getMonth()];
				let prevMonthStr = monthNames[this.locale][eh.month.prev];
				prevCallDelta = currTime - h.prevUpdateCallAt;
				changeValueAnimatedFixed(h.lel, h.el, prevMonthStr, monthStr, isSpedupRequested ? 0 : prevCallDelta);
				h.prev = start_date.getMonth();

				h = eh.year;
				prevCallDelta = currTime - h.prevUpdateCallAt;
				changeValueAnimatedFixed(h.lel, h.el, h.prev, v.year, isSpedupRequested ? 0 : prevCallDelta);
				h.prev = v.year;
			} else {
				for (let k in eh) {
					var h = eh[k];
					let prev = h.prev || '';
					let curr = v[k];
					if (prev == curr) continue
					let prevCallDelta = currTime - h.prevUpdateCallAt;
					changeValueAnimatedFixed(h.lel, h.el, prev, curr, isSpedupRequested ? 0 : prevCallDelta);
					h.prev = curr;
					h.prevUpdateCallAt = currTime;
				}
			}
		}
		setTheme(theme) {
			this.wrap.style.color = DEFAULT_CONFIG.text[theme];
			this.theme = theme;
		}
	}

	function RGBToHSL(H, { hFix = 0, sFix = 0, lFix = 0 }) {
		// Convert hex to RGB first
		let r = 0, g = 0, b = 0;
		if (H.length == 4) {
			r = '0x' + H[1] + H[1];
			g = '0x' + H[2] + H[2];
			b = '0x' + H[3] + H[3];
		} else if (H.length == 7) {
			r = '0x' + H[1] + H[2];
			g = '0x' + H[3] + H[4];
			b = '0x' + H[5] + H[6];
		}
		// Then to HSL
		r /= 255;
		g /= 255;
		b /= 255;
		let cmin = Math.min(r, g, b),
			cmax = Math.max(r, g, b),
			delta = cmax - cmin,
			h = 0,
			s = 0,
			l = 0;

		if (delta == 0) h = 0;
		else if (cmax == r) h = ((g - b) / delta) % 6;
		else if (cmax == g) h = (b - r) / delta + 2;
		else h = (r - g) / delta + 4;

		h = Math.round(h * 60);

		if (h < 0) h += 360;
		h += hFix;
		l = (cmax + cmin) / 2;
		s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
		s = +(s * 100 + sFix).toFixed(1);
		l = +(l * 100 + lFix).toFixed(1);

		return `hsl(${h},${s}%,${l}%)`
	}
	function applyThemeTo(H, theme) {
		if (!H) return ''
		return theme == 'day' ? H : RGBToHSL(H, { sFix: -20, lFix: -5 })
	}

	class CheckButton {
		constructor({ parentEl, labelText, iconColor, isChecked, onChange, onLongHold, theme }) {
			this.longDownDelay = 600;
			let button = document.createElement('div');
			this.button = button;
			this.iconColor = iconColor;
			this.onLongHold = onLongHold;
			this.onChange = onChange;
			button.classList.add('ae-check-button');
			button.innerHTML = `\
			<div class="ae-fake-borders"></div>
			<div class="ae-icon-wrap">
				<div class="ae-icon-background ae-check-icon"></div>
			</div>
			<label class="ae-label"></label>
		`;

			parentEl.appendChild(button);
			this.wrap = parentEl;
			this.onDownBT = this.onDown.bind(this);
			this.onUpBT = this.onUp.bind(this);
			this.onOutBT = this.onOut.bind(this);
			this.onWrapScrollBT = this.onWrapScroll.bind(this);

			button.addEventListener('mousedown', this.onDownBT);
			button.addEventListener('touchstart', this.onDownBT);

			let qs = button.querySelector.bind(button);
			this.elemsHash = {
				borders: qs('.ae-fake-borders'),
				label: qs('.ae-label')
			};
			this.elemsHash.label.textContent = labelText;


			this.setTheme(theme);
			this.toggleState(isChecked);
		}
		getColor() {
			return applyThemeTo(this.iconColor, this.theme)
		}
		setTheme(theme) {
			this.theme = theme;
			let color = this.getColor();
			let eh = this.elemsHash;
			if (this.isChecked) this.button.style.backgroundColor = color;
			if (!this.isChecked) this.elemsHash.label.style.color = color;
			eh.borders.style.borderColor = color;
		}
		onDown() {
			this.downTime = Date.now();
			document.body.addEventListener('mouseup', this.onUpBT);
			this.button.addEventListener('mouseout', this.onOutBT);
			this.button.addEventListener('touchend', this.onOutBT);
			this.wrap.addEventListener('scroll', this.onWrapScrollBT);
			document.body.addEventListener('scroll', this.onWrapScrollBT);
			this.downTimeout = setTimeout(() => {
				this.removeUpListners();
				this.onLongHold(!this.isChecked);
			}, this.longDownDelay);
		}
		onWrapScroll() {
			this.removeUpListners();
		}
		onUp(e) {
			this.removeUpListners();
			this.onChange(!this.isChecked);
		}
		onOut() {
			clearTimeout(this.downTimeout);
			this.removeUpListners();
		}
		removeUpListners() {
			document.body.removeEventListener('mouseup', this.onUpBT);
			this.button.removeEventListener('mouseout', this.onOutBT);
			this.button.removeEventListener('touchend', this.onOutBT);
			this.wrap.removeEventListener('scroll', this.onWrapScroll);
			document.body.removeEventListener('scroll', this.onWrapScrollBT);
			clearTimeout(this.downTimeout);
		}
		toggleState(isChecked) {
			if (isChecked == this.isChecked) return
			this.isChecked = isChecked;
			this.button.classList.toggle('ae-checked', isChecked);
			this.button.style.background = isChecked ? this.getColor() : '';
			this.elemsHash.label.style.color = !isChecked ? this.getColor() : '';
		}
		toggleAnimation(isEnabled) {
			this.button.classList.toggle('ae-no-animation', isEnabled);
		}
	}

	function clearElement(parentEl) {
		for (let c = parentEl.firstChild; c !== null; c = parentEl.firstChild) {
			parentEl.removeChild(c);
		}
	}

	class LegendModule {
		constructor({ wrap, items, callbacks, theme, getCurrPartData, getZoomValue, locale }) {
			this.callbacks = callbacks;
			this.wrap = wrap;
			this.locale = locale;
			this.items = [];
			this.togglerWrap = appendElem(wrap, 'div', ['ae-toggler']);
			this.buttsWrap = appendElem(wrap, 'div', ['ae-buttons']);
			this.plus = '<span class="ae-plus">+</span>';
			this.minus = '<span class="ae-plus">–</span>';
			this.buttons = [];
			this.buttonByCode = {};
			this.theme = theme;
			this.getZoomValue = getZoomValue;
			this.getCurrPartData = getCurrPartData;
			this.setTheme(theme);
			this.setItems(items);
			this.isZoomed = false;
			this.isExpanded = false;
			this.isNoExpandAnimation = false;
			this.togglerWrap.addEventListener('click', e => this.isExpanded ? this.setLegendCollapsed() : this.setLegendExpanded());
		}
		setItems(items) {
			let oldItemCodes = this.items.map(i => { return i.code });
			let isEqual = items.every(ni => ~oldItemCodes.indexOf(ni.code)) && items.length == this.items.length;
			if (isEqual) return

			if (this.items.length <= 1 && items.length > 1) this.fromOneToSome = true;
			if (this.items.length > 1 && items.length <= 1) this.fromOneToSome = true;
			this.items = items;
			this.genButtons();
			if (items.length > 10) this.setLegendCollapsed();
			else clearElement(this.togglerWrap);
		}
		onChartSpeedupRequest(level) {
			this.isSpedupRequested = level >= 2;
			let isNeeded = level >= 1;
			if (this.isNoExpandAnimation != isNeeded) {
				this.isNoExpandAnimation = isNeeded;
				if (isNeeded) this.buttsWrap.style.transition = 'none';
				else this.buttsWrap.style.transition = '';
			}
		}
		setZoomFromOutside(isZoomed) {
			this.isZoomed = isZoomed;
		}
		togglePosition() {
			let wrap = this.wrap;
			let mcf = DEFAULT_CONFIG.minimap;
			if (this.isIntervalSizeChanged()) {
				if (this.getCurrPartData().isSingleDay) {
					wrap.style.marginTop = -mcf.height - mcf.bottom - 4 + 'px';
					wrap.style.paddingTop = mcf.bottom + 1 + 'px';
					wrap.style.paddingBottom = mcf.bottom + 'px';
				} else {
					wrap.style.marginTop = '';
					wrap.style.paddingTop = '';
					wrap.style.paddingBottom = '';
				}
			}
		}
		togglePosTransition() {
			let newState = !this.isSpedupRequested && !this.fromOneToSome;
			if (this.prevPosTransState == newState) return
			this.wrap.style.transition = newState ? 'margin 0.1s linear' : '';
		}
		setLegendCollapsed() {
			this.togglerWrap.innerHTML = `${this.plus} ${labels.expandFilters[this.locale]} (${this.items.length})`;
			this.isExpanded = false;
			this.buttsWrap.style.maxHeight = 0;
			this.buttsWrap.style.visibility = 'hidden';
		}
		setLegendExpanded() {
			this.togglerWrap.innerHTML = `${this.minus} ${labels.collapseFilters[this.locale]}`;
			this.isExpanded = true;
			this.buttsWrap.style.maxHeight = '';
			this.buttsWrap.style.visibility = '';
		}
		genButtons() {
			clearElement(this.buttsWrap);
			this.items.forEach(item => {
				let button = new CheckButton({
					parentEl: this.buttsWrap,
					labelText: item.name,
					iconColor: item.color,
					isChecked: item.visibility.valueDest == 1,
					theme: this.theme,
					onChange: isChecked => this.callbacks.onToggle(item.code, isChecked),
					onLongHold: () =>
						this.items.forEach(i =>
							this.callbacks.onToggle(i.code, i.code == item.code),
						),
				});
				this.buttons.push(button);
				this.buttonByCode[item.code] = button;
			});
		}
		connect(core) { }
		disconnect() { }
		resize() { }
		isIntervalSizeChanged() {
			let newState = this.getCurrPartData().isSingleDay;
			if (this.prevIntState == newState) return
			this.prevIntState = newState;
			return true
		}
		updateOpacity(op) {
			if (this.prevOpacity == op) return
			this.prevOpacity = op;
			this.wrap.style.opacity = op;
		}
		updatePointerEvents() {
			let isEventsEnabled = !!this.items.length;
			if (this.prevPoEvents == isEventsEnabled) return
			this.prevPoEvents = isEventsEnabled;
			this.wrap.style.pointerEvents = this.items.length >= 1 ? '' : 'none';
		}
		animateFade() {
			let isSpedupRequested = this.isSpedupRequested;
			let ZoomValue = this.getZoomValue();
			if (ZoomValue == 0 || ZoomValue == 1) {
				if (this.items.length <= 1) clearElement(this.buttsWrap);
				if (this.items.length > 1) this.updateOpacity(1);
				return
			} else if (!this.fromOneToSome) {
				this.updateOpacity(1);
				return
			}
			if (isSpedupRequested) return this.updateOpacity(1)
			if (this.items.length <= 1) return this.updateOpacity(0)
			this.updateOpacity(ZoomValue);
		}
		redraw() {
			this.togglePosition();
			this.updatePointerEvents();
			let ZoomValue = this.getZoomValue();
			if (ZoomValue == 0 || ZoomValue == 1) {
				this.fromOneToSome = false;
				this.togglePosTransition();
			}
			this.animateFade();
		}
		setTheme(theme) {
			this.buttons.forEach(b => b.setTheme(theme));
			this.wrap.style.background = DEFAULT_CONFIG.background[theme];
			this.togglerWrap.style.paddingLeft = DEFAULT_CONFIG.chart.left + 'px';
			this.togglerWrap.style.paddingRight = DEFAULT_CONFIG.chart.right + 'px';
			this.buttsWrap.style.paddingLeft = DEFAULT_CONFIG.chart.left + 'px';
			this.buttsWrap.style.paddingRight = DEFAULT_CONFIG.chart.right + 'px';
		}
		toggle(code, isChecked) {
			this.buttonByCode[code].toggleState(isChecked);
		}
		toggleAnimation(isEnabled) {
			for (let button of this.buttons) button.toggleAnimation(isEnabled);
		}
	}

	class BattleRoyaleModule {
		constructor() {
			//TODO
		}
		connect(core) {}
		disconnect() {}
		resize() {}
		redraw() {}
	}

	let ccf = DEFAULT_CONFIG.chart;
	class TooltipModule {
		constructor({ wrap, canvasExt, drawFunc, locale, theme, getCurrPartData, onRegionZoomInClick }) {
			this.locale = locale;
			this.wrap = wrap;
			this.canvasExt = canvasExt;
			this.drawFunc = drawFunc;
			this.pointRadius = 3;
			this.lineWidth = 2;
			this.maxWidth = DEFAULT_CONFIG.tooltip.maxWidth;
			this.pos = null;
			this.x = null;
			this.y = null;
			this.tt = null;
			this.elemsHash = {};
			this.theme = theme;
			this.getCurrPartData = getCurrPartData;
			this.onRegionZoomInClick = onRegionZoomInClick;
		}

		show(pos, x, y) {
			this.pos = pos;
			this.x = x;
			this.y = y;
			if (this.tt) return
			this.tt = appendElem(this.wrap, 'div', ['ae-chart-tt']);
			this.tt.style.width = this.maxWidth + 'px';
			if (this.isZoomed) {
				this.tt.classList.add('ae-no-click');
			} else {
				setTimeout(()=> {
					if (this.tt) this.tt.addEventListener('click', this.onRegionZoomInClick);
				}, 200);
			}
		}
		hide() {
			if (!this.isShown()) return false
			this.pos = null;
			this.x = null;
			this.y = null;
			this.tt.parentElement.removeChild(this.tt);
			this.tt = null;
			this.html = null;
		}
		isShown() {
			return this.pos !== null
		}

		connect(core) { }
		disconnect() { }
		resize() { }
		setZoomFromOutside(isZoomed) {
			this.isZoomed = isZoomed;
		}
		isHoursInTitle() {
			return this.isZoomed && !this.getCurrPartData().isPercentage
		}
		isWithoutTitle() {
			return this.isZoomed && this.getCurrPartData().isPercentage
		}
		redraw() {
			if (!this.isShown()) return false

			let rc = this.canvasExt.rc;
			rc.save();
			rc.scale(this.canvasExt.pixelRatio, this.canvasExt.pixelRatio);
			let { xValue, rect, items } = this.drawFunc(rc, this.pos, this.x, this.y);
			rc.restore();

			this.updateElem(items, rect, xValue);
		}
		checkIfItemsChanged(newItems){
			if(newItems.length != this.items.length) return true
			if(newItems[0].name != this.items[0].name) return true
		}
		isPosChanged(xt, yt){
			if(this.xt == xt && this.yt == yt) return false
			this.xt = xt; 
			this.yt = yt;
			return true
		}
		updateElem(items, rect, xValue) {
			if (!this.isShown()) return false
			let partData = this.getCurrPartData();
			let chartType = partData.mainType;
			let isPercentage = partData.isPercentage;

			let isWithTotal = chartType == 'bar' && items.length > 1;
			if (isWithTotal && !this.html) this.allItem = { name: 'All' };
			if (isWithTotal) items.push(this.allItem);

			if (!this.html || this.checkIfItemsChanged(items)) {
				this.items = items;
				this.html = this.genTemplateHTML(items);
				this.setTheme(this.theme);
				this.tt.innerHTML = this.html;
				this.genElemsHash(items);
			}
			let fullWIdth = rect.width + ccf.left + ccf.right;
			let ttWidth = this.maxWidth;
			let xTtPos = 0, yTtPos = 0;
			if(isPercentage && this.isZoomed){
				xTtPos = Math.max(ccf.left, Math.min(this.x - ttWidth / 2, fullWIdth - ccf.right - ttWidth));
				yTtPos = Math.max(0, this.y - ccf.left * 3);
			} else {
				if(this.x - ccf.left> ttWidth){ //вывести слева
					xTtPos = Math.max(ccf.left, this.x - ccf.left - ttWidth);
				} else {
					xTtPos = Math.min(this.x + ccf.left, fullWIdth - ttWidth - ccf.right);
				}
			}
			xTtPos = Math.floor(xTtPos);
			yTtPos = Math.floor(yTtPos);

			if(this.isPosChanged(xTtPos, yTtPos)) this.tt.style.transform = `translate(${xTtPos}px, ${yTtPos}px)`;
			
			let isItemsAnimationDisabled = items.length > 11;
			this.tt.classList.toggle('ae-no-scroll', !isItemsAnimationDisabled);
			var currTime = Date.now();
			let prevCallDelta;

			let eh = this.elemsHash;
			this.prevXvalue = xValue;
			let totalSumm = 0;

			items.forEach(item => {
				let h = eh[item.name];
				let value = totalSumm;
				if ('yValue' in item) {
					value = item.yValue;
					totalSumm += item.yValue;
				}
				prevCallDelta = currTime - h.prevUpdateCallAt;

				let prev = bLongNums(h.prev ? Math.round(h.prev): null, this.locale);
				let curr = bLongNums(value ? Math.round(value) : null, this.locale);
				if (prev == curr) return
				changeValueAnimatedFixed(h.lel, h.el, prev, curr, isItemsAnimationDisabled ? 0 : prevCallDelta);
				h.prev = item.name != 'All' ? item.yValue : totalSumm;
				h.prevUpdateCallAt = currTime;
			});

			items.forEach(item => {
				let h = eh[item.name];
				if (!isPercentage) {
					h.pel.style.display = 'none';
				} else {
					h.pel.style.display = 'block';
				}
				let curr = (item.yPercent != null ? item.yPercent : Math.round(item.yValue / totalSumm * 100)) + '%';
				let prev = h.pPrev;
				prevCallDelta = currTime - h.pPrevUpdateCallAt;
				if (prev == curr) return
				changeValueAnimatedFixed(h.plel, h.pel, prev, curr, isItemsAnimationDisabled ? 0 : prevCallDelta);
				h.pPrev = curr;
				h.pPrevUpdateCallAt = currTime;
			});

			if(this.isWithoutTitle()) return
			let date = new Date(xValue);
			if (!this.isHoursInTitle()) {
				let dayStr = `${dayNames[this.locale][date.getDay()]}, ${date.getDate()}`;
				let prevDayStr = eh.day.prev_day ? `${dayNames[this.locale][eh.day.prev_day]}, ${eh.day.prev_date}` : '';
				if (dayStr != prevDayStr) {
					prevCallDelta = currTime - eh.day.prevUpdateCallAt;
					changeValueAnimatedFixed(eh.day.lel, eh.day.el, prevDayStr, dayStr, prevCallDelta);
					eh.day.prevUpdateCallAt = currTime;
				}

				let monthStr = monthNames[this.locale][date.getMonth()];
				let prevMonthStr = monthNames[this.locale][eh.month.prev];
				if (monthStr != prevMonthStr) {
					prevCallDelta = currTime - eh.month.prevUpdateCallAt;
					changeValueAnimatedFixed(eh.month.lel, eh.month.el, prevMonthStr, monthStr, prevCallDelta);
					eh.month.prevUpdateCallAt = currTime;
				}

				if (eh.year.prev != date.getFullYear()) {
					prevCallDelta = currTime - eh.year.prevUpdateCallAt;
					changeValueAnimatedFixed(eh.year.lel, eh.year.el, eh.year.prev, date.getFullYear(), prevCallDelta);
					eh.year.prevUpdateCallAt = currTime;
				}
			} else {
				let hh = date.getHours();
				let prevHh = eh.hhel.prev;
				if (hh != prevHh) {
					prevCallDelta = currTime - eh.hhel.prevUpdateCallAt;
					changeValueAnimatedFixed(eh.hhel.lel, eh.hhel.el, prevHh, hh, prevCallDelta);
					eh.hhel.prev = hh;
					eh.hhel.prevUpdateCallAt = currTime;
				}


				let mm = dateToMM(xValue);
				let prevMm = eh.mmel.prev;
				if (mm != prevMm) {
					prevCallDelta = currTime - eh.mmel.prevUpdateCallAt;
					changeValueAnimatedFixed(eh.mmel.lel, eh.mmel.el, eh.mmel.prev, mm, prevCallDelta);
					eh.mmel.prev = mm;
					eh.mmel.prevUpdateCallAt = currTime;
				}
			}

			this.elemsHash.day.prev_day = date.getDay();
			this.elemsHash.day.prev_date = date.getDate();
			this.elemsHash.month.prev = date.getMonth();
			this.elemsHash.year.prev = date.getFullYear();
		}
		setTheme(theme) {
			this.theme = theme;
			if (!this.isShown()) return
			this.tt.style.color = DEFAULT_CONFIG.text[theme];
			this.tt.style.background = DEFAULT_CONFIG.tooltip.background[theme];
			this.tt.style.boxShadow = DEFAULT_CONFIG.tooltip.shadow[theme];
			this.tt.style.transition = `background ${DEFAULT_CONFIG.scales.animDuration}`;
		}
		genTemplateHTML(items) {
			let spanWithVal = '<span class="ae-curr ae-span"></span>';
			let html = `${
			this.isWithoutTitle() ?
			'':
			`<div class="ae-head ae-flex-to-borders">
				${
					this.isHoursInTitle() ?
						`<div class="ae-to-left">
								<span class="ae-hh ae-cud-wrap ae-span">${spanWithVal}</span>:<span class="ae-mm ae-cud-wrap ae-span">${spanWithVal}</span> 
							</div>`
						:
						`<div class="ae-to-left">
								<span class="ae-day ae-cud-wrap ae-span">${spanWithVal}</span> 
								<span class="ae-month ae-cud-wrap ae-span">${spanWithVal}</span> 
								<span class="ae-year ae-cud-wrap ae-span">${spanWithVal}</span>
							</div>`
					}
				${!this.isZoomed ? `<div class="ae-to-right ae-zoom-arrow"></div>` : ''}
			</div>`
		}`;
			html += items.map((item, count) =>{
				var str = '';
				if(count == 0) str += '<div class="ae-body">';
				str += `<div class="ae-row ae-flex-to-borders">
								<div class="ae-cell-name ae-cud-wrap ae-to-left ae-percents" data-p-code="${item.name}">${spanWithVal}</div>
								<div class="ae-cell-name ae-to-left">${item.name}</div>
								<div class="ae-cell-value ae-cud-wrap ae-to-right" style="color:${ applyThemeTo(item.color, this.theme)}" data-code="${item.name}">${spanWithVal}</div>
							</div>`;
				if(items[count+1] && items[count+1].name == 'All') str += '</div>';
				return str
			}).join(''); 
			return html
		}
		genElemsHash(items) {
			var qs = this.tt.querySelector.bind(this.tt);
			items.forEach(item => {
				let el = qs(`[data-code="${item.name}"]`);
				let pel = qs(`[data-p-code="${item.name}"]`);
				this.elemsHash[item.name] = {
					el: el,
					lel: el.childNodes[0],
					pel: pel,
					plel: pel.childNodes[0],
				};
			});
			if(this.isWithoutTitle()) return
			if (!this.isHoursInTitle()) {
				let del = qs('.ae-day'), mel = qs('.ae-month'), yel = qs('.ae-year');
				this.elemsHash.day = { el: del, lel: del.childNodes[0] };
				this.elemsHash.month = { el: mel, lel: mel.childNodes[0] };
				this.elemsHash.year = { el: yel, lel: yel.childNodes[0] };
			} else {
				let hhel = qs('.ae-hh'), mmel = qs('.ae-mm');
				this.elemsHash.hhel = { el: hhel, lel: hhel.childNodes[0] };
				this.elemsHash.mmel = { el: mmel, lel: mmel.childNodes[0] };
			}
		}
	}

	// https://forum.libcinder.org/topic/smooth-thick-lines-using-geometry-shader#23286000001269127
	class LinePolyDrawer {
		constructor() {
			this.rc = null;
			this.view = null;
			this.rect = null;
			this.color = null;
			this.visibility = null;
			this.alpha = null;
			this.lineWidth = null;
			this.points = [];
		}
		reset(rc, view, rect) {
			this.rc = rc;
			this.view = view;
			this.rect = rect;
		}
		rowStart(color, visibility, alpha, lineWidth) {
			this.color = color;
			this.visibility = visibility;
			this.alpha = alpha;
			this.lineWidth = lineWidth;
			this.points.length = 0;
		}
		rowPoint(xPosGlobal, yPos) {
			let xPosView =
				(xPosGlobal - this.view.xPosFrom) / (this.view.xPosTo - this.view.xPosFrom);
			let x = xPosView * this.rect.width;
			let y = yPos * this.rect.height;
			if (y < -this.lineWidth * 3) y = -this.lineWidth * 3;

			if (this.points.length >= 4) {
				// Небольшая оптимизация: если угол между последними тремя точками достаточно мал,
				// пропускаем предыдущую точку. Это даёт +5% скорости, а разница внешне малозаметна.
				let i = this.points.length;
				let dx0 = x - this.points[i - 2];
				let dy0 = y - this.points[i - 2 + 1];
				let dx1 = x - this.points[i - 4];
				let dy1 = y - this.points[i - 4 + 1];
				//let len0 = Math.sqrt(dx0 * dx0 + dy0 * dy0)
				let len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
				// Для последних трёх точек (A, B, C) считаем проекцию AB на перпендикуляр к AC.
				// Если он достаточно мал, угол малозаметен, и его можно не рисовать.
				if (Math.abs(dx0 * dy1 - dy0 * dx1) / len1 < 0.5) this.points.length -= 2;
			}

			this.points.push(x, y);
		}
		_drawMidPoint(i, di, r) {
			// Три точки: левая, средняя и правая.
			// В средней точке соединяются линии от двух соседних,
			// и это соединение нужно правильно обрисовать.
			let x = this.points[i];
			let y = this.points[i + 1];
			// векторы левая-средняя и средняя-парвая
			let dx0 = x - this.points[i - di];
			let dy0 = y - this.points[i - di + 1];
			let dx1 = this.points[i + di] - x;
			let dy1 = this.points[i + di + 1] - y;
			// их длины
			let len0 = Math.sqrt(dx0 * dx0 + dy0 * dy0);
			let len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
			// нормализованные они же
			dx0 /= len0;
			dy0 /= len0;
			dx1 /= len1;
			dy1 /= len1;

			// "miter" - вектор, идущий по биссектрисе угла между линиями
			let mx = -dy0 - dy1;
			let my = +dx0 + dx1;
			let ml = 1 / Math.sqrt(mx * mx + my * my);
			mx *= ml;
			my *= ml;

			// "Правильная" длина miter'а.
			// Если использовать только её и добавлять в многоугольник по одной точке
			// на каждое соединение линий (с каждой стороны), везде получатся острые углы
			// (как при lineJoin = 'miter' у канваса).
			let mLen = r / (-mx * dy0 + my * dx0);
			// Это не всегда красиво, так что дальше есть некоторые улучшения.

			// Если сейчас обрисовываем внешнюю сторону угла
			// (т.е. если скалярное произведение между одной линией и нормальню ко второй положительное)
			if (dx0 * dy1 - dy0 * dx1 > 0) {
				// Скалярное произведение векторов линий, чем оно меньше, тем острее угол.
				let t = dx0 * dx1 + dy0 * dy1;
				// Если угол тупой с относительно незаметным изгибом (косинус угла между линиями меньше 0.5)...
				if (t > 0.5) {
					// ...рисуем на сгибе одну точку (как при lineJoin = 'miter')
					this.rc.lineTo(x - mx * mLen, y - my * mLen);
				} else {
					// Если угол острый или тупой, но с заметным изгибом, рисуем две точки (как при lineJoin = 'bevel')
					this.rc.lineTo(x + dy0 * r, y - dx0 * r);
					// Если угол ОЧЕНЬ острый, добавляем ещё одну точку посередине (на тонких линиях похоже на lineJoin = 'round')
					if (t < -0.8) this.rc.lineTo(x - mx * r, y - my * r);
					this.rc.lineTo(x + dy1 * r, y - dx1 * r);
				}
			} else {
				// Если обрисовываем внутреннюю сторону угла
				// Если угол настолько острый, что отображаемый угол уезжает от точки соединения
				// слишком далеко (дальше, чем длина соединяемых линий), рядом с точкой
				// появится артефакт в виде острого угла.
				// Это можно исправить, добавляя две вершины так, будто линия состоит из прямоугольных отрезков.
				// (как lineJoin = 'bevel', только на внутреннем угле).
				// Если же разность длин линий относительно небольшая ( Math.abs(len0 - len1) ),
				// можно всё равно добавлять одну вершину: при небольшой толщине линии артефакт не будет видно.
				let minLen = Math.min(len0, len1);
				if (mLen > minLen && Math.abs(len0 - len1) > 12) {
					this.rc.lineTo(x + dy0 * r, y - dx0 * r);
					this.rc.lineTo(x + dy1 * r, y - dx1 * r);
				} else {
					if (mLen > minLen) mLen = minLen; //иначе при плотнорасположенных линиях артефакт всё рано будет заметен
					this.rc.lineTo(x - mx * mLen, y - my * mLen);
				}
			}
		}
		_drawEndPoint(i, di, r, moveFirst) {
			let x = this.points[i];
			let y = this.points[i + 1];
			let dx = this.points[i + di] - x;
			let dy = this.points[i + di + 1] - y;
			let len = Math.sqrt(dx * dx + dy * dy);
			dx *= r / len;
			dy *= r / len;
			if (moveFirst) {
				this.rc.moveTo(x - dy, y + dx);
			} else {
				this.rc.lineTo(x - dy, y + dx);
			}
			this.rc.lineTo(x - dx, y - dy);
			this.rc.lineTo(x + dy, y - dx);
		}
		rowEnd() {
			this.rc.beginPath();
			let r = this.lineWidth / 2;

			this._drawEndPoint(0, 2, r, true);
			for (let i = 2; i < this.points.length - 2; i += 2) this._drawMidPoint(i, 2, r);

			this._drawEndPoint(this.points.length - 2, -2, r, false);
			for (let i = this.points.length - 4; i >= 2; i -= 2) this._drawMidPoint(i, -2, r);

			this.rc.fillStyle = this.color;
			this.rc.globalAlpha = this.visibility * this.alpha;
			this.rc.fill();
			this.rc.globalAlpha = 1;
		}
		allEnd() {}
	}

	class BarPolyDrawer {
		constructor() {
			this.rc = null;
			this.view = null;
			this.rect = null;
			this.color = null;
			this.alpha = null;
			this.rowsCount = 0;
			this.rowPointsCount = 0;
			this.xMin = 0;
			this.xPrev = 0;
			this.yPrev = 0;
			this.yMax = 0;
			this.extraColumn = null;
		}
		reset(rc, view, rect) {
			this.rc = rc;
			this.view = view;
			this.rect = rect;
			this.color = null;
			this.alpha = null;
			this.rowsCount = 0;
			this.rowPointsCount = 0;
			this.xMin = 0;
			this.xPrev = 0;
			this.yPrev = 0;
			this.yMax = 0;
			this.extraColumn = null;
		}
		rowStart(color, visibility, alpha, lineWidth) {
			this.color = color;
			this.alpha = alpha;
			this.rowPointsCount = 0;
		}
		rowPoint(xPosGlobal, yPos) {
			let xPosView =
				(xPosGlobal - this.view.xPosFrom) / (this.view.xPosTo - this.view.xPosFrom);

			let x = xPosView * this.rect.width;
			let y = yPos * this.rect.height;

			if (this.rowPointsCount == 0) {
				this.rc.beginPath();
				this.rc.moveTo(x, 0);
				this.xMin = x;
			} else {
				this.rc.lineTo(x, this.yPrev);
			}

			if (y > this.yMax) this.yMax = y;

			this.rc.lineTo(x, y);
			this.xPrev = x;
			this.yPrev = y;
			this.rowPointsCount += 1;
		}
		rowEnd() {
			this.rc.lineTo(this.xPrev, 0);
			this.rc.fillStyle = this.color;
			this.rc.globalAlpha = this.alpha;
			this.rc.globalCompositeOperation = 'destination-over';
			this.rc.fill();
			this.rc.globalCompositeOperation = 'source-over';
			this.rc.globalAlpha = 1;
			this.rowsCount += 1;
		}
		allEnd() {
			this.rc.globalCompositeOperation = 'destination-out';
			this.rc.fillStyle = 'black';
			this.rc.globalAlpha = (1 - 0.85) * this.alpha;
			this.xMin -= 0.5;
			this.xPrev += 0.5;
			if (this.extraColumn === null) {
				this.rc.fillRect(this.xMin, 0, this.xPrev - this.xMin, this.yMax);
			} else {
				let ecol = this.extraColumn;
				this.rc.fillRect(ecol.xFrom, 0, ecol.xTo - ecol.xFrom, this.yMax);
				this.rc.globalAlpha = (1 - 0.85 * ecol.outerAlpha) * this.alpha;
				this.rc.fillRect(this.xMin, 0, ecol.xFrom - this.xMin, this.yMax);
				this.rc.fillRect(ecol.xTo, 0, this.xPrev - ecol.xTo, this.yMax);
			}
			this.rc.globalAlpha = 1;
			this.rc.globalCompositeOperation = 'source-over';
		}
		// extra
		highlightColumn(xPosFrom, xPosTo, outerAlpha) {
			let { xPosFrom: vFrom, xPosTo: vTo } = this.view;
			let xPosView = (xPosFrom - vFrom) / (vTo - vFrom);
			let xFrom = xPosView * this.rect.width;
			xPosView = (xPosTo - vFrom) / (vTo - vFrom);
			let xTo = xPosView * this.rect.width;
			this.extraColumn = { xFrom, xTo, outerAlpha };
		}
	}

	class StackedPolyDrawer {
		constructor() {
			this.rc = null;
			this.view = null;
			this.rect = null;
			this.color = null;
			this.rowsCount = 0;
			this.rowPointsCount = 0;
			this.xMin = 0;
			this.xPrev = 0;
			this.allPointsAtTop = true;
			this.circleAnimK = 0;
			this.centerPos = null;
			this.circleValues = null;
		}
		reset(rc, view, rect) {
			this.rc = rc;
			this.view = view;
			this.rect = rect;
			this.color = null;
			this.rowsCount = 0;
			this.rowPointsCount = 0;
			this.xMin = 0;
			this.xPrev = 0;
			this.xPosGlobalPrev = 0;
			this.allPointsAtTop = true;
			this.circleAnimK = 0;
			this.centerPos = null;
			this.circleValues = null;
			this.midPointDrawn = false;
		}
		rowStart(color, visibility, alpha, lineWidth) {
			this.color = color;
			this.rowPointsCount = 0;
			this.allPointsAtTop = true;
			this.xPosGlobalPrev = 0;
			this.midPointDrawn = false;
			if (this.rowsCount == 0 && this.circleAnimK > 0) {
				let w = this.rect.width;
				let h = this.rect.height;
				let circleRadius = Math.min(w, h) / 2.2;
				let k = this.circleAnimK;
				let r = circleRadius * k;
				let xMargin = (w / 2 - circleRadius) * k;
				let yMargin = (h / 2 - circleRadius) * k;
				this.rc.save();
				this.rc.beginPath();
				roundedRect(this.rc, xMargin, yMargin, w - xMargin * 2, h - yMargin * 2, r);
				this.rc.clip();
			}
			this.rc.beginPath();
		}
		_getCenterXGlobalPos() {
			if (this.centerPos === null) return (this.view.xPosTo + this.view.xPosFrom) / 2
			return this.centerPos
			//return (this.view.xPosTo + this.view.xPosFrom) / 2
		}
		_getCenterXPos() {
			return (
				(this._getCenterXGlobalPos() - this.view.xPosFrom) /
				(this.view.xPosTo - this.view.xPosFrom)
			)
		}
		_getCenterX() {
			return this._getCenterXPos() * this.rect.width
			// let k = this.circleAnimK
			// return (0.5 * k + this._getCenterXPos() * (1 - k))
		}
		_recalcXY(x, y, angleCirc, radius) {
			let k = this.circleAnimK;
			let cx = this._getCenterX();
			let cy = 0.5 * this.rect.height * 2;
			let dx = x - cx;
			let dy = y - cy;
			let angleBar = Math.atan2(dy, dx);
			let angleFrom = -this.circleValues[this.rowsCount + 1].value * Math.PI * 2 - 0.001;
			let angleTo = -this.circleValues[this.rowsCount].value * Math.PI * 2 + 0.001;
			if (angleCirc == -99)
				angleCirc =
					(x < cx ? angleFrom : angleTo) * k + ((angleFrom + angleTo) / 2) * (1 - k);
			//if (x > cx && y > cy) angleCirc -= Math.PI*2
			// if (angleCirc - angleBar > Math.PI*2) angleCirc -= Math.PI*2
			// if (angleCirc - angleBar < -Math.PI*2) angleCirc += Math.PI*2
			let ak = Math.pow(k, 5);
			let angle = angleCirc * ak + angleBar * (1 - ak);
			let dk = Math.abs(dx) / this.rect.width;
			let rk = 1 - k + dk * k; //Math.max(0,1-(k*(1.2-dk))) + dk*k
			if (radius == -99) radius = Math.sqrt(dx * dx + dy * dy) * rk;
			x = radius * Math.cos(angle) + cx * (1 - k) + 0.5 * this.rect.width * k;
			let ksq = k; //Math.pow(k, 0.5)
			y = radius * Math.sin(angle) + cy * (1 - ksq) + 0.5 * this.rect.height * ksq;
			return [x, y]
		}
		_drawMidPoint(xPosGlobal, yPos) {
			let xPosView =
				(xPosGlobal - this.view.xPosFrom) / (this.view.xPosTo - this.view.xPosFrom);
			let x = xPosView * this.rect.width;
			let y = yPos * this.rect.height;
			let [xDraw, yDraw] = this._recalcXY(x, y, -99, -99);
			this.rc.lineTo(xDraw, yDraw);
			this.midPointDrawn = true;
		}
		rowPoint(xPosGlobal, yPos) {
			let w = this.rect.width;
			let h = this.rect.height;

			let xPosView =
				(xPosGlobal - this.view.xPosFrom) / (this.view.xPosTo - this.view.xPosFrom);
			let x = xPosView * w;
			let y = yPos * h;

			if (yPos < 0.999 || yPos > 1.001) this.allPointsAtTop = false;

			if (this.rowPointsCount == 0) this.xMin = x;

			if (!this.allPointsAtTop && this.rowPointsCount == 0) {
				let xDraw = x;
				let yDraw = 0;
				if (this.circleAnimK > 0) {
					let angleFrom = -this.circleValues[this.rowsCount + 1].value * Math.PI * 2;
					let angleTo = -this.circleValues[this.rowsCount].value * Math.PI * 2;
					let angle = angleFrom + (angleTo - angleFrom) / 3
					;[xDraw, yDraw] = this._recalcXY(xDraw, yDraw, angle, w * 5);
				}
				this.rc.moveTo(xDraw, yDraw);
				if (this.circleAnimK > 0) {
					let angle = -this.circleValues[this.rowsCount + 1].value * Math.PI * 2
					;[xDraw, yDraw] = this._recalcXY(x - w, 0, angle, w * 5);
					this.rc.lineTo(xDraw, yDraw);
				}
			}

			let xDraw = x;
			let yDraw = y;
			let midPointDrawn = false;
			if (this.circleAnimK > 0) {
	[xDraw, yDraw] = this._recalcXY(xDraw, yDraw, -99, -99);
				let cPos = this._getCenterXGlobalPos();
				if (this.xPosGlobalPrev < cPos && xPosGlobal >= cPos) {
					this._drawMidPoint(cPos, yPos);
					midPointDrawn = true;
				}
			}

			//if (this.circleAnimK == 0 || (xDraw > 0 && xDraw < w && yDraw > 0 && yDraw < h))
			if (!this.allPointsAtTop && !midPointDrawn) this.rc.lineTo(xDraw, yDraw);

			this.rowPointsCount += 1;
			this.xPrev = x;
			this.yPrev = y;
			this.xPosGlobalPrev = xPosGlobal;
		}
		rowEnd() {
			//this.rc.globalAlpha = 0.25
			if (this.allPointsAtTop) {
				this.rc.rect(this.xMin, 0, this.xPrev - this.xMin, this.rect.height);
			} else {
				if (this.circleAnimK > 0) {
					//if (!this.midPointDrawn) this._drawMidPoint(null, null)
					let angle = -this.circleValues[this.rowsCount].value * Math.PI * 2;
					let [xDraw, yDraw] = this._recalcXY(
						this.xPrev + this.rect.width,
						0,
						angle,
						this.rect.width * 5,
					);
					this.rc.lineTo(xDraw, yDraw);
				}
				let xDraw = this.xPrev;
				let yDraw = 0;
				if (this.circleAnimK > 0) {
					let angleFrom = -this.circleValues[this.rowsCount + 1].value * Math.PI * 2;
					let angleTo = -this.circleValues[this.rowsCount].value * Math.PI * 2;
					let angle = angleFrom + ((angleTo - angleFrom) / 3) * 2
					;[xDraw, yDraw] = this._recalcXY(
						this.xPrev,
						0,
						angle,
						this.rect.width * 5,
					);
				}
				this.rc.lineTo(xDraw, yDraw);
			}

			this.rc.fillStyle = this.color;
			this.rc.globalCompositeOperation = 'destination-over';
			//this.rc.stroke()
			this.rc.fill();
			this.rc.globalCompositeOperation = 'source-over';
			this.rowsCount += 1;
		}
		allEnd() {
			if (this.circleAnimK > 0) this.rc.restore();
			this.rc.globalCompositeOperation = 'destination-out';
			this.rc.fillStyle = 'black';
			this.rc.globalAlpha = 1 - 0.85;
			this.rc.fillRect(this.xMin, 0, this.xPrev - this.xMin, this.rect.height);
			this.rc.globalAlpha = 1;
			this.rc.globalCompositeOperation = 'source-over';

			if (this.circleValues !== null) {
				let prevSum = this.circleValues[0].value;
				for (let i = 1; i < this.circleValues.length; i++) {
					let sum = this.circleValues[i].value;
					let line = this.circleValues[i].line;
					let value = sum - prevSum;
					let percents = value * 100;
					let angle = (-(sum + prevSum) / 2) * Math.PI * 2;
					prevSum = sum;

					let roundedPercents = Math.round(percents);
					// немного дивгаем торчащени под 45 градусов сторки, чтоб они меньше задевали об края
					if (roundedPercents >= 7)
						angle += Math.cos((angle + Math.PI / 8) * 4) / 50;

					if (roundedPercents < 3) continue

					let w = this.rect.width;
					let h = this.rect.height;
					let cx = 0.5 * w;
					let cy = 0.5 * h - 1;

					let rk = 0.5 + (15 - percents) / 50;
					rk = Math.max(0.55, Math.min(0.85, rk));
					let radius = (Math.min(w, h) / 2.1) * rk;
					//let k = Math.min(1, this.circleAnimK * 1.5)
					let color = 'white';

					if (roundedPercents < 7) {
						radius = Math.min(w, h) / 1.9;
						color = line.color;
					}

					let dx = radius * Math.cos(angle);
					let dy = radius * Math.sin(angle);

					let size = percents * (1.8 + rk / 2);
					if (roundedPercents >= 10) size *= 0.75;
					dy += size / 10;
					size = Math.ceil(Math.min(30, Math.max(size, 12)));

					let rc = this.rc;
					rc.save();
					rc.globalAlpha = Math.max(0, this.circleAnimK - 0.9) * 10;
					rc.translate(cx, cy);
					if (roundedPercents < 7) {
						rc.beginPath();
						rc.moveTo(dx * 0.91, dy * 0.91);
						rc.lineTo(dx * 0.86, dy * 0.86);
						rc.strokeStyle = color;
						rc.stroke();
					}
					rc.translate(dx, dy);
					rc.scale(1, -1);
					rc.translate(-dx, -dy);
					rc.textAlign = 'center';
					rc.textBaseline = 'middle';
					rc.font = `${size}px sans-serif`;
					rc.fillStyle = color;
					//rc.strokeText(roundedPercents + '%', dx, dy)
					rc.fillText(roundedPercents + '%', dx, dy);
					// rc.fillStyle = 'red'
					// rc.fillRect(dx - 1, dy - 1, 3, 3)
					rc.restore();
				}
			}
		}
		//extra
		setCircleAnim(circleAnimK, centerPos, circleValues) {
			// if (!this.q) {
			// 	this.q = 1
			// 	document.body.addEventListener('mousemove', e => {
			// 		this.circleAnimK = Math.max(
			// 			0,
			// 			Math.min(1, (e.clientX - 10) / (document.body.offsetWidth - 20)),
			// 		)
			// 	})
			// }
			this.circleAnimK = circleAnimK;
			this.centerPos = centerPos;
			if (circleAnimK == 0) {
				this.circleValues = null;
			} else {
				this.circleValues = circleValues.slice();
				this.circleValues.unshift({ value: 0, line: null });
				for (let i = 0; i < this.circleValues.length - 1; i++)
					this.circleValues[i + 1].value += this.circleValues[i].value;
			}
		}
	}

	class SimpleTooltipLegDrawer {
		constructor() {
			this.lineWidth = 2;
		}

		reset(rc, view, rect, x) {
			rc.fillStyle = 'rgba(24, 45, 59, 0.1)';
			rc.fillRect(x - 0.5, rect.top, 0.5, rect.height);
		}

		point(x, y, color) {}
		end() {}
	}

	class CirclesTooltipLegDrawer {
		constructor() {
			this.rc = null;
			this.pointRadius = 3;
			this.lineWidth = 2;
			this.rect = null;
		}

		reset(rc, view, rect, x) {
			this.rc = rc;
			this.rect = rect;
			this.rc.fillStyle = 'rgba(148,172,188,0.3)';
			// подрисовываем вертикальную полоску под содержимое графика, иначе она некрасиво перекрывает линии
			this.rc.globalCompositeOperation = 'destination-over';
			this.rc.fillRect(x - 0.5, rect.top, 0.5, rect.height);
			this.rc.globalCompositeOperation = 'source-over';
		}

		point(x, y, color) {
			if (y > this.rect.top + this.rect.height + this.pointRadius) return
			this.rc.beginPath();
			this.rc.moveTo(x + this.pointRadius, y);
			this.rc.arc(x, y, this.pointRadius, 0, 2 * Math.PI);
			// вырезаем кружок-дырку, чтоб в этом месте не было видно линий, но было видно фон
			this.rc.globalCompositeOperation = 'destination-out';
			this.rc.fillStyle = 'black';
			this.rc.fill();
			this.rc.globalCompositeOperation = 'source-over';
			this.rc.lineWidth = this.lineWidth;
			this.rc.strokeStyle = color;
			this.rc.stroke();
		}

		end() {}
	}

	const Graph = {
		render: function(container, chart) {
			let params = { locale: 'en' };
			function getTheme() {
				return document.documentElement.classList.contains('dark') ? 'night' : 'day'
			}
			let tgchart = new TGChart({
				wrap: container,
				chartData: chart,
				params,
				theme: getTheme(),
			});
			document.addEventListener('darkmode', () => tgchart.setTheme(getTheme()));
			// в процессе добавляения графиков меняется вёрстка
			// (в частности добавляются скроллбары), но события resize'а не происходит,
			// так что нужно обновить размеры ещё раз явно
			setTimeout(() => tgchart.resize(), 1);
			return tgchart
		},
	};

	// для удобства настройки и изменения, сам чарт разбит на подкомпоненты
	class TGChart {
		constructor({ wrap, chartData, params, theme }) {
			let config = DEFAULT_CONFIG;
			this.theme = theme;
			this.title = chartData.title;
			this.locale = params.locale || config.locale;
			this.chartBodyCoords = config.chart;
			this.miniMapCoords = Object.assign(
				{
					left: this.chartBodyCoords.left,
					right: this.chartBodyCoords.right,
				},
				config.minimap,
			);
			this.lineWidths = {
				main: config.chart.lineWidth,
				minimap: config.minimap.lineWidth,
			};
			this.isGrabbed = false;

			this.performance = {
				disableButsAnimation: false,
				pixelratioCoeff: 1,
				forceNextFullResFrames: 0,
				pointsPerPixel: {
					allMain: [1.5, 1.2, 1, 0.33],
					allMMap: [1, 0.5, 0.5, 0.33],
					main: 1.5,
					minimap: 1,
				},
			};

			let data = regroupChartData(chartData);

			this.detailsLoader = null;
			if (data.requestZoomData !== null) {
				this.detailsLoader = new TGChartChunkLoder({
					requestZoomData: data.requestZoomData,
					onChunkReady: this.onChunkLoad.bind(this),
				});
			}

			let limit = new AnimatedSpeedRange({ valueFrom: 0, valueTo: 0 });
			let rightLimit = null;
			if (data.doubleYScaled)
				rightLimit = new AnimatedSpeedRange({ valueFrom: 0, valueTo: 0 });
			let mmapLimit = new AnimatedSpeedRange({ valueFrom: 0, valueTo: 0 });
			this.tooltipVisibility = new AnimatedSpeedLimit({ value: 0 });

			this.regionZoom = new AnimatedSpeedLimit({ value: 0, accelK: 0.005 });
			this.mainPart = new TGChartLinePart({
				data,
				limit,
				rightLimit,
				mmapLimit,
				onPartDrawStart: this.onPartDrawStart.bind(this),
			});
			this.curPart = this.mainPart;
			this.detailsPart = null;

			this.setupLayout(wrap, params);

			let fullDuration = data.xValues[data.xValues.length - 1] - data.xValues[1];
			let dayDuration = 24 * 3600 * 1000;
			let minPosWidth =
				Math.round(
					(fullDuration / 365) * config.chart.minDaysRangePerYear * dayDuration,
				) /
				fullDuration /
				dayDuration;
			this.view = new HChartSmoothedView({ xPosFrom: 0.6, xPosTo: 0.95, minPosWidth });
			this.viewBeforeZoom = new HChartView({ minPosWidth });
			this.viewAfterZoom = new HChartView({});
			this.destZoomStamp = null;
			this.mmapOuterViewAfterZoom = new HChartView({});

			this.zoomTooltipPos = null;

			this.chartCanvasExt = new CanvasExt(this.chartCanvas);
			this.scalesCanvasExt = new CanvasExt(this.scalesCanvas);
			this.chartModule = new ChartModule({
				wrap: this.canvasWrap,
				canvasExt: this.chartCanvasExt,
				drawFunc: this.chartDrawFunc.bind(this),
				view: this.view,
				rect: new RectTop(this.chartBodyCoords),
			});
			let chartControlModule = new ChartControlModule({
				eventsElem: this.chartCanvas,
				leaveElem: this.canvasWrap,
				callbacks: {
					onHover: this.onChartHover.bind(this),
					onLeave: this.onChartLeave.bind(this),
					onMove: this.onChartMove.bind(this),
					onZoom: this.onChartZoom.bind(this),
					onGrab: this.onChartGrab.bind(this),
					onRelease: this.onChartRelease.bind(this),
					onClick: this.onRegionZoomInClick.bind(this),
				},
				chartModule: this.chartModule,
			});
			this.minimapModule = new MinimapModule({
				canvasExt: this.chartCanvasExt,
				eventsElem: appendElem(this.canvasWrap, 'div', ['ae-minimap-events'], {
					position: 'absolute',
					left: 0,
					right: 0,
					bottom: 0,
					height:
						this.miniMapCoords.bottom +
						this.miniMapCoords.height +
						this.miniMapCoords.marginTop / 2 +
						'px',
				}),
				view: this.view,
				rect: new RectBottom(this.miniMapCoords),
				frameConfig: config.minimap.frame,
				drawFunc: this.minimapDrawFunc.bind(this),
				callbacks: {
					onMove: this.onChartMove.bind(this),
					onZoom: this.onChartZoom.bind(this),
					onGrab: this.onChartGrab.bind(this),
					onRelease: this.onChartRelease.bind(this),
				},
			});
			this.legendModule = new LegendModule({
				wrap: this.legendElem,
				items: data.lines,
				theme: this.theme,
				locale: this.locale,
				getCurrPartData: this.getCurrPartData.bind(this),
				getZoomValue: () => this.regionZoom.value,
				callbacks: { onToggle: this.onLineToggle.bind(this) },
			});
			this.tooltipModule = new TooltipModule({
				wrap: this.canvasWrap,
				canvasExt: this.chartCanvasExt,
				drawFunc: this.tooltipDrawFunc.bind(this),
				locale: this.locale,
				theme: this.theme,
				getCurrPartData: this.getCurrPartData.bind(this),
				onRegionZoomInClick: this.onRegionZoomInTooltip.bind(this),
			});
			this.chartHead = new ChartHead({
				wrap: this.chartTitleWrap,
				getEnds: this.calcEndsForHScale.bind(this),
				theme: this.theme,
				locale: this.locale,
				title: this.title,
				onRegionZoomOutClick: this.onRegionZoomOut.bind(this),
				getZoomValue: () => this.regionZoom.value,
			});
			//this.chartHead.onChartSpeedupRequest(2)
			let hScalesModule = new HScalesModule({
				canvasExt: this.scalesCanvasExt,
				getEnds: this.calcEndsForHScale.bind(this),
				locale: this.locale,
				config: DEFAULT_CONFIG.scales,
				theme: this.theme,
				isDisabled: () => {
					return this.curPart.data.isPercentage && this.regionZoom.value > 0
				},
				getCurrPartData: this.getCurrPartData.bind(this),
			});
			let vScalesModule = new VScalesModule({
				canvasExt: this.scalesCanvasExt,
				getEnds: this.getCalcEndsForVScale(this.curPart.limit),
				locale: this.locale,
				config: DEFAULT_CONFIG.scales,
				theme: this.theme,
				labelColor: this.curPart.data.doubleYScaled
					? data.leftScaledLines[0].color
					: null,
				getCurrPartData: this.getCurrPartData.bind(this),
			});
			this.vScalesModule = vScalesModule;
			let modules = [
				this.chartModule,
				this.chartHead,
				vScalesModule,
				hScalesModule,
				chartControlModule,
				this.minimapModule,
				this.tooltipModule,
				this.legendModule,
				new BattleRoyaleModule(),
			];
			if (this.curPart.data.doubleYScaled) {
				let vScalesModuleRight = new VScalesModule({
					canvasExt: this.scalesCanvasExt,
					getEnds: this.getCalcEndsForVScale(this.curPart.rightLimit),
					locale: this.locale,
					config: DEFAULT_CONFIG.scales,
					theme: this.theme,
					stickTo: 'right',
					labelColor: data.rightScaledLines[0].color,
					getCurrPartData: this.getCurrPartData.bind(this),
				});
				this.vScalesModuleRight = vScalesModuleRight;
				modules.push(vScalesModuleRight);
			}
			this.modules = modules;
			this.chart = new ChartCore({
				wrap: this.wrap,
				modules,
				canvases: [this.chartCanvasExt, this.scalesCanvasExt],
				animValues: [
					this.mainPart.limit,
					this.mainPart.rightLimit,
					this.mainPart.mmapLimit,
					this.tooltipVisibility,
					this.view,
					this.regionZoom,
				]
					.concat(data.lines.map(l => l.visibility))
					.filter(v => v !== null),
				onSpeedupRequest: this.onChartSpeedupRequest.bind(this),
				onRedrawStart: this.onChartRedrawStart.bind(this),
				onAnimationEnd: this.onChartAnimationEnd.bind(this),
			});
			addEventListener('resize', () => this.resize());
		}
		getCurrPartData() {
			return this.curPart.data
		}
		calcEndsForHScale() {
			let vals = this.mainPart.data.xValues;
			let { xPosFrom, xPosTo } = this.view;
			return {
				start_dtime: vals[1] + (vals[vals.length - 1] - vals[1]) * xPosFrom,
				end_dtime: vals[1] + (vals[vals.length - 1] - vals[1]) * xPosTo,
			}
		}
		getCalcEndsForVScale(limit) {
			return () => {
				let LLimit = this.mainPart.limit;
				return {
					start_value: limit.valueFrom,
					end_value: limit.valueTo,
					final_start_value: limit.valueFromDest,
					final_end_value: limit.valueToDest,
					isLeftLimitVisible: LLimit.valueFromDest != LLimit.valueToDest,
					isRightLimitVisible: limit.valueFromDest != limit.valueToDest,
				}
			}
		}

		setupLayout(wrap) {
			this.wrap = wrap;
			clearElement(wrap);
			wrap.classList.add('ae-chart');

			this.chartTitleWrap = appendElem(wrap, 'div', ['ae-chart-head']);
			this.canvasWrap = appendElem(wrap, 'div', ['ae-canvas-wrap']);
			let cbc = this.chartBodyCoords;
			let mmc = this.miniMapCoords;
			this.canvasWrap.style.height =
				cbc.top + cbc.height + mmc.marginTop + mmc.height + mmc.bottom + 'px';

			this.chartCanvas = appendElem(this.canvasWrap, 'canvas', [
				'ae-chart-canvas',
				'ae-canvas',
			]);
			this.scalesCanvas = appendElem(this.canvasWrap, 'canvas', [
				'ae-scales-canvas',
				'ae-canvas',
			]);

			this.legendElem = appendElem(wrap, 'div', ['ae-legend-wrap']);

			this.chartTitleWrap.style.paddingLeft = DEFAULT_CONFIG.chart.left + 'px';
			this.chartTitleWrap.style.paddingRight = DEFAULT_CONFIG.chart.right + 'px';
		}

		onPartDrawStart(part, iFrom, iTo) {
			let drawer = part.data.pointsDrawer;
			if ('highlightColumn' in drawer) {
				if (this.tooltipModule.isShown()) {
					let xPos = this.minimapModule.outerView.posToInner(this.tooltipModule.pos);
					let [xTipPosFrom, xTipPosTo] = this._getTooltipedXPosAndIndexRange(xPos);
					let outerAlpha = 1 - 0.5 * this.tooltipVisibility.value;
					part.data.pointsDrawer.highlightColumn(xTipPosFrom, xTipPosTo, outerAlpha);
				} else if (this.tooltipVisibility.value > 0) {
					let outerAlpha = 1 - 0.5 * this.tooltipVisibility.value;
					part.data.pointsDrawer.highlightColumn(0, 0, outerAlpha);
				}
			}

			if (part.data.isPercentage) {
				// iFrom, iTo в функцию приходят с учётом полей, для пирога их учитывать не надо
				let { xPosFrom, xPosTo } = this.view;
				let iFrom = getIndexFromPosBinary(xPosFrom, this.curPart.data.xValues, 1);
				let iTo = getIndexFromPosBinary(xPosTo, this.curPart.data.xValues, 1);
				part.data.pointsDrawer.setCircleAnim(
					this.regionZoom.value,
					this.zoomTooltipPos,
					getPercentSums(part.data.lines, iFrom, iTo),
				);
			}
		}

		chartDrawFunc(rc, view) {
			let { xPosFrom, xPosTo } = this.chartModule.getOuterPos();
			let pointsPerPixel = this.performance.pointsPerPixel.main;

			let rect = this.chartModule.rect;
			let zoom = this.regionZoom;

			if (zoom.value < 1 || this.detailsPart === null)
				this.mainPart.draw(
					rc,
					rect,
					view,
					xPosFrom,
					xPosTo,
					pointsPerPixel,
					zoom,
					true,
				);

			if (this.detailsPart !== null) {
				let viewCur = view.copy();
				viewCur.xPosFrom = this.mmapOuterViewAfterZoom.posToInner(viewCur.xPosFrom);
				viewCur.xPosTo = this.mmapOuterViewAfterZoom.posToInner(viewCur.xPosTo);
				xPosFrom = this.mmapOuterViewAfterZoom.posToInner(xPosFrom);
				xPosTo = this.mmapOuterViewAfterZoom.posToInner(xPosTo);
				this.detailsPart.draw(
					rc,
					rect,
					viewCur,
					xPosFrom,
					xPosTo,
					pointsPerPixel,
					zoom,
					false,
				);
			}

			let ttVis = this.tooltipModule.isShown() ? 1 : 0;
			this.tooltipVisibility.setDest(ttVis);
		}

		minimapDrawFunc(rc, view, rect) {
			let zoom = this.regionZoom;
			let pointsPerPixel = this.performance.pointsPerPixel.minimap;

			if (zoom.value < 1 || this.detailsPart === null)
				this.mainPart.drawMinimap(rc, rect, view, pointsPerPixel, zoom, true);

			if (this.detailsPart !== null) {
				let viewCur = view.copy();
				viewCur.xPosFrom = this.mmapOuterViewAfterZoom.posToInner(viewCur.xPosFrom);
				viewCur.xPosTo = this.mmapOuterViewAfterZoom.posToInner(viewCur.xPosTo);
				this.detailsPart.drawMinimap(rc, rect, viewCur, pointsPerPixel, zoom, false);
			}

			for (let line of this.curPart.data.lines)
				if (!line.visibility.finished()) this.minimapModule.handleMassChange();
			if (!this.curPart.mmapLimit.finished()) this.minimapModule.handleMassChange();

			this.chart.increaseCurFrameComplexity((view.xPosTo - view.xPosFrom) * 0.15);
		}

		_getTooltipedXPosAndIndexRange(xPos) {
			let xValues = this.curPart.data.xValues;
			let xMin = xValues[1];
			let xMax = xValues[xValues.length - 1];

			let i = getIndexFromPosBinary(xPos, xValues, 1);
			if (this.curPart.data.mainType == 'bar') i = Math.min(i, xValues.length - 2);
			let xPosPrev = (xValues[i] - xMin) / (xMax - xMin);
			let iNext = Math.min(i + 1, xValues.length - 1);
			let xPosNext = (xValues[iNext] - xMin) / (xMax - xMin);

			return [xPosPrev, xPosNext, i, iNext]
		}
		_getTooltipedXPosAndIndex(xPos) {
			let [xPosPrev, xPosNext, i, iNext] = this._getTooltipedXPosAndIndexRange(xPos);
			if (this.curPart.data.mainType == 'bar') return [xPosPrev, i]
			// к какой из точек (левой или правой) тултип ближе
			if (xPos - xPosPrev < xPosNext - xPos) {
				return [xPosPrev, i]
			} else {
				return [xPosNext, iNext]
			}
		}

		tooltipDrawFunc(rc, xPos, pointX, pointY) {
			let xValues = this.curPart.data.xValues;

			xPos = this.minimapModule.outerView.posToInner(xPos);
			let [xTipPos, i] = this._getTooltipedXPosAndIndex(xPos);

			let xPosGlobal = this.minimapModule.outerView.posFromInner(xTipPos);
			let xPosView =
				(xPosGlobal - this.view.xPosFrom) / (this.view.xPosTo - this.view.xPosFrom);
			let x = xPosView * this.chartModule.rect.width + this.chartModule.rect.left;

			let ttLegDrawer = null;
			if (!this.curPart.data.isPercentage || this.regionZoom.value == 0)
				ttLegDrawer = this.curPart.data.tooltipLegDrawer;
			if (ttLegDrawer) ttLegDrawer.reset(rc, this.view, this.chartModule.rect, x);

			let items = [];

			if (this.curPart.data.isPercentage && this.regionZoom.valueDest == 1) {
				let { left, top, width, height } = this.chartModule.rect;
				let angle = Math.atan2(pointY - top - height / 2, pointX - left - width / 2);
				if (angle < 0) angle = 2 * Math.PI + angle;

				let { xPosFrom, xPosTo } = this.view;
				let iFrom = getIndexFromPosBinary(xPosFrom, this.curPart.data.xValues, 1);
				let iTo = getIndexFromPosBinary(xPosTo, this.curPart.data.xValues, 1);
				//if (iTo < this.curPart.data.xValues.length - 1) iTo += 1

				let totalSum = 0;
				for (let line of this.curPart.data.lines) {
					if (line.visibility.valueDest == 0) continue
					for (let i = iFrom; i < iTo; i++)
						totalSum += line.values[i] * line.visibility.value;
				}

				let destSum = (angle / Math.PI / 2) * totalSum;
				let sum = 0;
				for (let line of this.curPart.data.lines) {
					if (line.visibility.valueDest == 0) continue
					let lineSum = 0;
					for (let i = iFrom; i < iTo; i++)
						lineSum += line.values[i] * line.visibility.value;
					sum += lineSum;
					if (sum >= destSum) {
						items.push({
							color: line.color,
							name: line.name,
							yValue: lineSum,
							yPercent: Math.round((lineSum / totalSum) * 100),
						});
						break
					}
				}
			} else {
				for (let line of this.curPart.data.lines) {
					if (line.visibility.valueDest == 0) continue

					let value = line.values[i];
					let limit =
						this.curPart.data.rightScaledLines.indexOf(line) != -1
							? this.curPart.rightLimit
							: this.curPart.limit;
					let yPos = limit.getPos(value);
					let y =
						(1 - yPos) * this.chartModule.rect.height + this.chartModule.rect.top;

					if (ttLegDrawer) ttLegDrawer.point(x, y, line.color);

					items.push({
						color: line.color,
						name: line.name,
						yValue: value,
					});
				}
			}

			//if (this.tooltipLegDrawer) this.tooltipLegDrawer.end()
			return { items, xValue: xValues[i], rect: this.chartModule.rect }
		}

		onChartHover(x, y) {
			if (this.isGrabbed) return
			if (this.regionZoom.value > 0 && this.regionZoom.value < 1) return
			if (this.curPart.data.lines.some(l => l.visibility.valueDest == 1)) {
				this.tooltipModule.show(this.chartModule.canvasXToPos(x), x, y);
				this.chart.requestRedraw();
			}
		}

		onChartLeave(x, y) {
			this.tooltipModule.hide();
			this.chart.requestRedraw();
			if (!this.isGrabbed) this.performance.forceNextFullResFrames = 15;
		}

		onChartMove(dPosLeft, dPosRight) {
			this.tooltipModule.hide();
			if (dPosRight === undefined) dPosRight = dPosLeft;
			this.view.move(dPosLeft, dPosRight);
			this.chart.requestRedraw();
		}

		onChartZoom(delta, xPos) {
			this.tooltipModule.hide();
			this.view.scale(xPos, delta);
			this.chart.requestRedraw();
		}

		onChartGrab() {
			this.isGrabbed = true;
			this.tooltipModule.hide();
			this.chart.requestRedraw();
		}

		onChartRelease() {
			this.isGrabbed = false;
		}

		onRegionZoomInTooltip() {
			if (!this.tooltipModule.isShown()) return
			this.onRegionZoomIn(this.tooltipModule.pos);
		}
		onRegionZoomInClick(point) {
			this.onRegionZoomIn(this.chartModule.canvasXToPos(point.x));
		}
		_updateDestZoomParams(desiredStamp, detailsPart) {
			let part = this.mainPart;
			let xValsLen = part.data.xValues.length;
			let minStamp = part.data.xValues[1];
			let maxStamp = part.data.xValues[xValsLen - 1];

			let delta = 3;
			desiredStamp = Math.max(
				minStamp,
				Math.min(desiredStamp, maxStamp - 24 * 3600 * 1000),
			);
			if (detailsPart != null) {
				let detMinStamp = detailsPart.data.xValues[1];
				let detMaxStamp =
					detailsPart.data.xValues[detailsPart.data.xValues.length - 1];
				desiredStamp = Math.max(
					detMinStamp,
					Math.min(desiredStamp, detMaxStamp - 24 * 3600 * 1000),
				);
				delta = Math.floor((detMaxStamp - detMinStamp) / (24 * 3600 * 1000) / 2);
			}
			this.destZoomStamp = desiredStamp;

			let stampFrom = desiredStamp;
			let stampTo = desiredStamp + 24 * 3600 * 1000;

			//this.zoomTooltipPos = (desiredStamp - minStamp) / (maxStamp - minStamp)

			let mmapStampFrom = Math.max(minStamp, stampFrom - delta * 24 * 3600 * 1000);
			let mmapStampTo = Math.min(maxStamp, stampTo + delta * 24 * 3600 * 1000);
			this.mmapOuterViewAfterZoom.xPosFrom =
				(mmapStampFrom - minStamp) / (maxStamp - minStamp);
			this.mmapOuterViewAfterZoom.xPosTo =
				(mmapStampTo - minStamp) / (maxStamp - minStamp);

			this.viewAfterZoom.xPosFrom = (stampFrom - minStamp) / (maxStamp - minStamp);
			this.viewAfterZoom.xPosTo = (stampTo - minStamp) / (maxStamp - minStamp);
			this.viewAfterZoom.minPosWidth = (24 * 3600 * 1000) / (maxStamp - minStamp);

			this.zoomTooltipPos = this.viewAfterZoom.xPosFrom;
		}
		onRegionZoomIn(zoomPos) {
			if (!this.mainPart.data.isZoomable) return
			if (this.regionZoom.valueDest != 0) return

			this.view.copyPosTo(this.viewBeforeZoom);

			let part = this.mainPart;
			let [midPos] = this._getTooltipedXPosAndIndex(zoomPos);
			let index = getIndexFromPosBinary(midPos, part.data.xValues, 1);
			let xValsLen = part.data.xValues.length;
			let curStamp = part.data.xValues[Math.max(1, Math.min(index, xValsLen - 2))]; //-2, потому что для линий данных по последней точке нет, а для баров последняя точка - самодельная
			this._updateDestZoomParams(curStamp, null);

			this.regionZoom.setDest(1);
			this.chart.requestRedraw();
			this.tooltipModule.hide();
			this.legendModule.setZoomFromOutside(true);
			this.tooltipModule.setZoomFromOutside(true);
			this.vScalesModuleRight && this.vScalesModuleRight.setZoomFromOutside(true);
			this.vScalesModule.setZoomFromOutside(true);

			if (this.detailsLoader !== null) {
				this.detailsLoader.fetchChunk(curStamp);
				this.chartModule.showChartMessageWithDelay(
					labels.slowLoading[this.locale],
					500,
				);
			}
		}
		onRegionZoomOut() {
			if (this.regionZoom.valueDest == 0) return //TODO: убрать посе фикса повторного вызова

			this.zoomTooltipPos = this.view.xPosFrom;

			this.legendModule.setItems(this.mainPart.data.lines);
			this.tooltipModule.setZoomFromOutside(false);
			this.legendModule.setZoomFromOutside(false);
			this.vScalesModuleRight && this.vScalesModuleRight.setZoomFromOutside(false);
			this.vScalesModule.setZoomFromOutside(false);

			//this.zoomTooltipPos = null
			this.regionZoom.setDest(0);
			this.chart.requestRedraw();
			this.mmapOuterViewAfterZoom.xPosFrom = this.minimapModule.outerView.xPosFrom;
			this.mmapOuterViewAfterZoom.xPosTo = this.minimapModule.outerView.xPosTo;
			this.viewAfterZoom.xPosFrom = this.view.xPosFrom;
			this.viewAfterZoom.xPosTo = this.view.xPosTo;

			if (this.detailsPart !== null) {
				this.mainPart.limit = this.detailsPart.limit;
				this.mainPart.rightLimit = this.detailsPart.rightLimit;
				this.detailsPart.detachLimits();
				this.mainPart.resetLimits();
				this.mainPart.setLineVisibilitiesBy(this.detailsPart);
			}

			if (this.detailsLoader !== null) {
				this.detailsLoader.forgetLastRequest();
			}

			this.tooltipModule.hide();
		}
		onChunkLoad(chunk) {
			if (chunk.hasFailed) {
				this.chartModule.showChartMessage(labels.loadingError[this.locale]);
				setTimeout(() => this.onRegionZoomOut(), 100);
				return
			}
			this.chartModule.hideChartMessage();

			this.detailsPart = new TGChartLinePart({
				data: regroupChartData(chunk.data),
				limit: this.mainPart.limit,
				rightLimit: this.mainPart.rightLimit,
				mmapLimit: this.mainPart.mmapLimit,
				onPartDrawStart: this.onPartDrawStart.bind(this),
			});
			this.detailsPart.setLineVisibilitiesBy(this.mainPart);

			this._updateDestZoomParams(this.destZoomStamp, this.detailsPart);

			this.mainPart.detachLimits();
			this.detailsPart.resetLimits();

			this.chart.addAnimValues(this.detailsPart.data.lines.map(l => l.visibility));

			this.legendModule.setItems(this.detailsPart.data.lines);
		}

		onLineToggle(code, on) {
			this.curPart.data.lineByCode[code].visibility.setDest(on ? 1 : 0);
			this.legendModule.toggle(code, on);
			this.minimapModule.handleMassChange();
			this.chart.requestRedraw();

			if (this.curPart.data.lines.every(l => l.visibility.valueDest == 0)) {
				let msg = emptyChartLabels[this.locale];
				this.chartModule.showChartMessage(msg);
			} else {
				this.chartModule.hideChartMessage();
			}
		}

		onChartRedrawStart() {
			let ratioK = this.performance.pixelratioCoeff;
			if (this.tooltipModule.isShown()) {
				this.chart.increaseCurFrameComplexity(0.5);
				ratioK = 1; //если по графику ездит тултип, плавность практически не нужна, рисуем всё в исходном размере
			}
			if (this.performance.forceNextFullResFrames > 0) {
				ratioK = 1;
				this.performance.forceNextFullResFrames--;
				this.chart.ignoreCurFrameDelta();
			}
			if (this.chartCanvasExt.setPixelRatioCoeff(ratioK)) {
				this.minimapModule.handleMassChange();
			}

			let zoomK = this.regionZoom.value;
			if (zoomK > 0.5 && this.detailsPart) {
				this.curPart = this.detailsPart;
			}
			if (zoomK <= 0.5) {
				this.curPart = this.mainPart;
			}
			if (zoomK == 0 && this.regionZoom.finished()) {
				if (this.detailsPart !== null) {
					let values = this.detailsPart.data.lines.map(l => l.visibility);
					this.chart.removeAnimValues(values);
					this.detailsPart = null;
					this.chart.requestRedraw();
				}
			}

			// если это процентный пирог, отключаем повторную очистку полосы под графиком: там будут отображаться числа
			let shouldClear = !(zoomK > 0.5 && this.mainPart.data.isPercentage);
			this.chartModule.toggleBottomClear(shouldClear);

			if (!this.regionZoom.still()) {
				//  /------ mmap outer ------\
				// *--------------*------*----*
				// A              B view C    D
				// coeff between B and A or C and D
				let zoomKToMmapK = function(pos, k) {
					// pos = 1 - pos
					// let t = ((1 - pos) / pos) * k + 1
					// return (t - 1) / (t * (1 - pos))
					return k / (k * pos + 1 - pos)
				};

				let { xPosFrom, xPosTo } = this.mmapOuterViewAfterZoom;
				let viewFromK = zoomKToMmapK(xPosFrom, zoomK);
				let viewToK = zoomKToMmapK(1 - xPosTo, zoomK);

				this.minimapModule.outerView.xPosFrom =
					this.mmapOuterViewAfterZoom.xPosFrom * viewFromK;
				this.minimapModule.outerView.xPosTo =
					1 - viewToK + this.mmapOuterViewAfterZoom.xPosTo * viewToK;
				this.minimapModule.handleMassChange();

				let xPosFromCur = this.viewBeforeZoom.xPosFrom;
				let xPosToCur = this.viewBeforeZoom.xPosTo;
				let xPosFromDest = this.mmapOuterViewAfterZoom.posToInner(
					this.viewAfterZoom.xPosFrom,
				);
				let xPosToDest = this.mmapOuterViewAfterZoom.posToInner(
					this.viewAfterZoom.xPosTo,
				);
				let _xPosFrom = xPosFromCur * (1 - zoomK) + xPosFromDest * zoomK;
				let _xPosTo = xPosToCur * (1 - zoomK) + xPosToDest * zoomK;
				this.view.move(
					this.minimapModule.outerView.posFromInner(_xPosFrom) -
						this.view.xRealPosFrom,
					this.minimapModule.outerView.posFromInner(_xPosTo) - this.view.xRealPosTo,
				);
				this.view.setLimits(
					this.mmapOuterViewAfterZoom.xPosFrom * zoomK,
					1 - zoomK + this.mmapOuterViewAfterZoom.xPosTo * zoomK,
				);
				this.view.sync();
			}
			this.view.dest.minPosWidth =
				this.regionZoom.value == 0
					? this.viewBeforeZoom.minPosWidth
					: this.viewAfterZoom.minPosWidth;
		}

		onChartAnimationEnd() {
			if (this.chartCanvasExt.setPixelRatioCoeff(1)) {
				this.minimapModule.handleMassChange();
				this.chart.redrawCurrentState();
			}
			this.performance.forceNextFullResFrames = 0;
		}

		onChartSpeedupRequest(level) {
			let ppp = this.performance.pointsPerPixel;
			let prevMmapPPP = ppp.minimap;
			ppp.main = ppp.allMain[level];
			ppp.minimap = ppp.allMMap[level];
			if (prevMmapPPP != this.performance.pointsPerPixel.minimap)
				this.minimapModule.handleMassChange();

			this.performance.disableButsAnimation = level >= 1;
			this.performance.pixelratioCoeff = level >= 3 ? 1 / 1.5 : level >= 2 ? 1 / 1.2 : 1;

			this.legendModule.toggleAnimation(!this.performance.disableButsAnimation);

			if (this.chartCanvasExt.setPixelRatioCoeff(this.performance.pixelratioCoeff)) {
				this.minimapModule.handleMassChange();
				this.chart.redrawCurrentState();
			}
			this.chartHead.onChartSpeedupRequest(level);
			this.legendModule.onChartSpeedupRequest(level);
		}

		resize() {
			this.chart.resize();
		}

		setTheme(theme) {
			this.modules.forEach(m => m.setTheme && m.setTheme(theme));
			this.minimapModule.handleMassChange();
			this.chart.requestRedraw();
		}
	}

	//  =====================================
	// =======================================
	//  =====================================

	function regroupChartData(chartData) {
		let doubleYScaled = !!chartData.y_scaled;
		let isPercentage = !!chartData.percentage;
		let isStacked = !!chartData.stacked;
		let requestZoomData = chartData.x_on_zoom || null;

		let xValues = null;
		for (let values of chartData.columns) {
			let code = values[0];
			if (chartData.types[code] === 'x') xValues = values;
		}
		if (xValues === null) throw new Error('missing x-values')

		let lines = [];
		let lineByCode = {};
		let mainType = null;
		for (let values of chartData.columns) {
			let code = values[0];
			if (code === 'x') continue
			let type = chartData.types[code];

			if (mainType !== null && mainType != type)
				throw new Error(`chart line types must be same (got ${mainType} and ${type})`)
			mainType = type;

			let yMin = Infinity;
			let yMax = 0;
			for (let i = 1; i < values.length; i++) {
				yMax = Math.max(yMax, values[i]);
				yMin = Math.min(yMin, values[i]);
			}

			let line = {
				values,
				yMin,
				yMax,
				type,
				code: values[0],
				color: chartData.colors[code],
				name: chartData.names[code],
				visibility: new AnimatedSpeedLimit({ value: 1 }),
			};
			lineByCode[code] = line;
			lines.push(line);
		}

		if (mainType == 'bar') {
			// Изначально даные не копировались, чтоб сэкономить немного времени и памяти.
			// Но у баров нужно выводить последний столбец, и это сильно проще сделать, добавив в конец одну точку.
			// Менять исходные данные нехорошо, так что... копирование тепреь есть, как минимум для баров.
			// TODO: добавить копирование везде, причём в типизированные массивы; сравнить скорость.
			for (let line of lines) {
				line.values = line.values.slice();
				line.values.push(line.values[line.values.length - 1]);
			}
			xValues = xValues.slice();
			let xMin = xValues[1];
			let xMax = xValues[xValues.length - 1];
			xValues.push(xMax + (xMax - xMin) / (xValues.length - 2));
		}

		let leftScaledLines = lines.slice();
		let rightScaledLines = doubleYScaled ? [leftScaledLines.pop()] : [];
		// if (doubleYScaled) {
		// 	let t = rightScaledLines
		// 	rightScaledLines = leftScaledLines
		// 	leftScaledLines = t
		// }

		let drawerClass = {
			line: LinePolyDrawer,
			area: StackedPolyDrawer,
			bar: BarPolyDrawer,
		}[mainType];
		let legClass = {
			line: CirclesTooltipLegDrawer,
			area: SimpleTooltipLegDrawer,
			bar: null,
		}[mainType];
		let pointsDrawer = new drawerClass();
		let tooltipLegDrawer = legClass && new legClass();

		return {
			originalData: chartData,
			title: chartData.title,
			mainType,
			doubleYScaled,
			isPercentage,
			isStacked,
			isSingleDay: xValues[xValues.length - 1] - xValues[1] < 25 * 3600 * 1000,
			xValues,
			lines,
			lineByCode,
			leftScaledLines,
			rightScaledLines,
			pointsDrawer,
			tooltipLegDrawer,
			requestZoomData,
			isZoomable: requestZoomData !== null || isPercentage,
		}
	}

	//  =====================================
	// =======================================
	//  =====================================

	function drawPointsSimple(drawer, xValues, yValues, iFrom, iTo, bottomValue, topValue) {
		let xMin = xValues[1];
		let xMax = xValues[xValues.length - 1];

		for (let i = iFrom; i <= iTo; i++) {
			let value = yValues[i];
			let xPosGlobal = (xValues[i] - xMin) / (xMax - xMin);
			let yPos = (value - bottomValue) / (topValue - bottomValue);
			drawer.rowPoint(xPosGlobal, yPos);
		}
	}

	function getReducedIFrom(iFrom, reduction) {
		//-1, потому что отчёт начинаетя от первого элемента
		return Math.max(1, Math.floor((iFrom - 1) / reduction) * reduction + 1)
	}
	function getReducedITo(iTo, reduction, valsLen) {
		//-1 уже нет, потому что отсчёт оттуда же, но iTo учитывается включительно
		//+1, потмоу что нужен ещё один сегмент, чтоб правильно отрисовать сочленение
		return Math.min(valsLen - 1, Math.ceil(iTo / reduction + 1) * reduction)
	}

	function drawPointsReduced(
		drawer,
		xValues,
		yValues,
		iFrom,
		iTo,
		bottomValue,
		topValue,
		n,
	) {
		let xMin = xValues[1];
		let xMax = xValues[xValues.length - 1];
		let nIHalf = Math.floor(n / 2);

		iFrom = getReducedIFrom(iFrom, n);
		iTo = getReducedITo(iTo, n, xValues.length);

		for (let _i = iFrom; _i <= iTo; _i += n) {
			let i = _i | 0;
			var y0 = yValues[i];
			var y1 = yValues[i];
			var i0 = i;
			var i1 = i;
			for (let j = i; j < Math.min(i + n, iTo + 1); j++) {
				if (yValues[j] > y0) {
					y0 = yValues[j];
					i0 = j;
				}
				if (yValues[j] < y1) {
					y1 = yValues[j];
					i1 = j;
				}
			}
			// prettier-ignore
			if (i0 > i1) {
				let t = i0; i0 = i1; i1 = t;
				t = y0; y0 = y1; y1 = t;
			}
			i0 = i;
			i1 = i < yValues.length - n ? i + nIHalf : yValues.length - 1;
			//TODO: maybe it's better:
			// i0 = (i0+i)>>1
			// i1 = (i1+i+n)>>1
			var xPosGlobal = (xValues[i0] - xMin) / (xMax - xMin);
			var yPos = (y0 - bottomValue) / (topValue - bottomValue);
			drawer.rowPoint(xPosGlobal, yPos);
			xPosGlobal = (xValues[i1] - xMin) / (xMax - xMin);
			yPos = (y1 - bottomValue) / (topValue - bottomValue);
			drawer.rowPoint(xPosGlobal, yPos);
		}
	}

	class LinesDrawerPlain {
		constructor() {
			this.pointsDrawer = null;
			this.xValues = null;
			this.iFrom = 0;
			this.iTo = 0;
			this.limit = null;
			this.cfg = { reduction: 1, lineWidth: 1, visibilityCoeff: 1, alpha: 1 };
		}
		setCfgParam(name, value) {
			this.cfg[name] = value;
		}
		start(pointsDrawer, xValues, lines, iFrom, iTo, limit) {
			this.pointsDrawer = pointsDrawer;
			this.xValues = xValues;
			this.iFrom = iFrom;
			this.iTo = iTo;
			this.limit = limit;
		}
		line(line, yValues) {
			if (line.visibility.value == 0) return
			let visibility = Math.pow(line.visibility.value, this.cfg.visibilityCoeff);
			let limit = this.limit;
			if (typeof limit == 'function') limit = limit(line);

			this.pointsDrawer.rowStart(
				line.color,
				visibility,
				this.cfg.alpha,
				this.cfg.lineWidth,
			);
			if (this.cfg.reduction <= 2) {
				drawPointsSimple(
					this.pointsDrawer,
					this.xValues,
					yValues,
					this.iFrom,
					this.iTo,
					limit.valueFrom,
					limit.valueTo,
				);
			} else {
				drawPointsReduced(
					this.pointsDrawer,
					this.xValues,
					yValues,
					this.iFrom,
					this.iTo,
					limit.valueFrom,
					limit.valueTo,
					this.cfg.reduction,
				);
			}
			this.pointsDrawer.rowEnd();
		}
		end() {}
	}

	class LinesDrawerStackedWrap {
		constructor(child) {
			this.child = child;
			this.iFrom = 0;
			this.iTo = 0;
			this.sums = [];
			this.cfg = { reduction: 1 };
		}

		_updateSums(line, values) {
			if (line.visibility.value == 0) return
			let prevLen = this.sums.length;
			if (prevLen != values.length) {
				this.sums.length = values.length;
				for (let i = prevLen; i < this.sums.length; i++) this.sums[i] = 0;
			}
			let iFrom = Math.max(1, this.iFrom - Math.ceil(this.cfg.reduction * 2));
			let iTo = Math.min(
				values.length - 1,
				this.iTo + Math.ceil(this.cfg.reduction * 2),
			);
			// let iFrom = getReducedIFrom(this.iFrom, this.cfg.reduction)-this.cfg.reduction*2 |0
			// let iTo = getReducedITo(this.iTo, this.cfg.reduction, values.length)+this.cfg.reduction*2 |0
			for (let i = iFrom; i <= iTo; i++)
				this.sums[i] += values[i] * line.visibility.value;
		}

		setCfgParam(name, value) {
			if (name in this.cfg) this.cfg[name] = value;
			this.child.setCfgParam(name, value);
		}

		start(pointsDrawer, xValues, lines, iFrom, iTo, limit) {
			this.iFrom = iFrom;
			this.iTo = iTo;
			this.sums.fill(0);
			this.child.start(pointsDrawer, xValues, null, this.iFrom, this.iTo, limit);
		}

		line(line, yValues) {
			this._updateSums(line, yValues);
			this.child.line(line, this.sums);
		}

		end() {
			this.child.end();
		}
	}

	class LinesDrawerPercentageWrap {
		constructor(child) {
			this.child = child;
			this.iFrom = 0;
			this.iTo = 0;
			this.lines = null;
			this.sums = [];
			this.values = [];
			this.cfg = { reduction: 1 };
		}

		_updateSums(line, values) {
			if (line.visibility.value == 0) return
			let prevLen = this.sums.length;
			if (prevLen != values.length) {
				this.sums.length = values.length;
				for (let i = prevLen; i < this.sums.length; i++) this.sums[i] = 0;
				this.values.length = values.length;
			}
			// let iFrom = Math.max(1, this.iFrom - 100)
			// let iTo = Math.min(values.length - 1, this.iTo + 250)
			let iFrom = Math.max(1, this.iFrom - Math.ceil(this.cfg.reduction * 2));
			let iTo = Math.min(
				values.length - 1,
				this.iTo + Math.ceil(this.cfg.reduction * 2),
			);
			for (let i = iFrom; i <= iTo; i++)
				this.sums[i] += values[i] * line.visibility.value;
		}

		setCfgParam(name, value) {
			if (name in this.cfg) this.cfg[name] = value;
			this.child.setCfgParam(name, value);
		}

		start(pointsDrawer, xValues, lines, iFrom, iTo, limit) {
			this.iFrom = iFrom;
			this.iTo = iTo;

			this.sums.fill(0);
			for (let i = 0; i < lines.length; i++) this._updateSums(lines[i], lines[i].values);

			this.child.start(pointsDrawer, xValues, null, this.iFrom, this.iTo, limit);
		}

		line(line, yValues) {
			if (line.visibility.value == 0) return
			// let iFrom = Math.max(1, this.iFrom - 100)
			// let iTo = Math.min(yValues.length - 1, this.iTo + 250)
			let iFrom = Math.max(1, this.iFrom - Math.ceil(this.cfg.reduction * 2));
			let iTo = Math.min(
				yValues.length - 1,
				this.iTo + Math.ceil(this.cfg.reduction * 2),
			);
			for (let i = iFrom; i <= iTo; i++)
				this.values[i] = (yValues[i] / this.sums[i]) * 100;
			this.child.line(line, this.values);
		}

		end() {
			this.child.end();
		}
	}

	function drawAllLinesWith(linesDrawer, pointsDrawer, xValues, lines, iFrom, iTo, limit) {
		linesDrawer.start(pointsDrawer, xValues, lines, iFrom, iTo, limit);
		for (let i = 0; i < lines.length; i++) linesDrawer.line(lines[i], lines[i].values);
		linesDrawer.end();
	}

	class PlainMinMaxSearcher {
		getMinMaxGlobal(lines) {
			let yMin = Infinity;
			let yMax = 0;
			for (let line of lines)
				if (line.visibility.valueDest != 0) {
					if (line.yMin < yMin) yMin = line.yMin;
					if (line.yMax > yMax) yMax = line.yMax;
				}
			if (yMin > yMax) yMin = yMax;
			return [yMin, yMax]
		}

		getMinMaxPartial(lines, iFrom, iTo) {
			let yMin = Infinity;
			let yMax = 0;
			for (let line of lines)
				if (line.visibility.valueDest == 1)
					for (let i = iFrom; i <= iTo; i++) {
						if (yMax < line.values[i]) yMax = line.values[i];
						if (yMin > line.values[i]) yMin = line.values[i];
					}
			if (yMin > yMax) yMin = yMax;
			return [yMin, yMax, yMax]
		}
	}

	class PlainZeroMinMaxSearcher {
		constructor() {
			this.base = new PlainMinMaxSearcher();
		}
		getMinMaxGlobal(lines) {
			let res = this.base.getMinMaxGlobal(lines);
			res[0] = 0;
			return res
		}

		getMinMaxPartial(lines, iFrom, iTo) {
			let res = this.base.getMinMaxPartial(lines, iFrom, iTo);
			res[0] = 0;
			return res
		}
	}

	class StackedMinMaxSearcher {
		constructor() {
			this.prevVisibilities = [];
			this.prevYMax = 0;
		}
		_saveVisibilities(lines) {
			this.prevVisibilities.length = lines.length;
			for (let i = 0; i < lines.length; i++)
				this.prevVisibilities[i] = lines[i].visibility.value;
		}
		_visibilitiesHaveChanged(lines) {
			if (this.prevVisibilities.length != lines.length) return true
			for (let i = 0; i < lines.length; i++)
				if (this.prevVisibilities[i] != lines[i].visibility.value) return true
			return false
		}
		getMinMaxGlobal(lines) {
			if (this._visibilitiesHaveChanged(lines)) {
				let yMax = 0;
				let len = lines.length == 0 ? 0 : lines[0].values.length;
				for (let i = 1; i < len; i++) {
					let ySum = 0;
					for (let j = 0; j < lines.length; j++) {
						let value = lines[j].visibility.value;
						if (value > 0) ySum += lines[j].values[i] * value;
					}
					if (ySum > yMax) yMax = ySum;
				}
				this._saveVisibilities(lines);
				this.prevYMax = yMax;
				return [0, yMax]
			} else {
				return [0, this.prevYMax]
			}
		}
		getMinMaxPartial(lines, iFrom, iTo) {
			let yMax = 0;
			let yMaxDest = 0;
			for (let i = iFrom; i <= iTo; i++) {
				let ySum = 0;
				let ySumDest = 0;
				for (let j = 0; j < lines.length; j++) {
					let value = lines[j].visibility.value;
					if (value > 0) ySum += lines[j].values[i] * value;
					if (lines[j].visibility.valueDest == 1) ySumDest += lines[j].values[i];
				}
				if (ySum > yMax) yMax = ySum;
				if (ySumDest > yMaxDest) yMaxDest = ySumDest;
			}
			return [0, yMax, yMaxDest]
		}
	}

	class PercentageMinMaxSearcher {
		getMinMaxGlobal(lines) {
			return [0, 100]
		}
		getMinMaxPartial(lines, iFrom, iTo) {
			return [0, 100, 100]
		}
	}

	function getPercentSums(lines, iFrom, iTo) {
		let sums = [];
		let totalSum = 0;
		for (let line of lines) {
			if (line.visibility.value > 0) {
				let sum = 0;
				for (let i = iFrom; i < iTo; i++)
					sum += line.values[i] * line.visibility.value;
				sums.push({ value: sum, line });
				totalSum += sum;
			}
		}
		for (let i = 0; i < sums.length; i++) sums[i].value /= totalSum;
		return sums
	}

	function roundYMin(yMin, yMax) {
		yMin -= yMax * 0.03;
		if (yMin <= 0) return 0
		let k = Math.pow(10, Math.floor(Math.log(yMin) / Math.LN10 - 1));
		yMin = Math.floor(yMin / k) * k;
		if (yMin >= yMax) return 0
		if (yMin < 10) return Math.floor(yMin)
		return yMin //Math.floor(yMin / 5) * 5
	}

	function roundYMax(yMax) {
		if (yMax <= 0) return 0
		let k = Math.pow(10, Math.floor(Math.log(yMax) / Math.LN10 - 1));
		yMax = Math.ceil(yMax / k) * k;
		if (yMax < 1) return 1
		if (yMax < 10) return Math.ceil(yMax)
		return yMax //Math.ceil(yMax / 5) * 5
	}

	class TGChartLinePart {
		constructor({ data, limit, rightLimit, mmapLimit, onPartDrawStart = null }) {
			this.data = data;
			this.limit = limit;
			this.rightLimit = rightLimit;
			this.mmapLimit = mmapLimit;
			this.onPartDrawStart = onPartDrawStart;

			this.linesDrawer = new LinesDrawerPlain();
			if (data.isStacked)
				this.linesDrawer = new LinesDrawerStackedWrap(this.linesDrawer);
			if (data.isPercentage)
				this.linesDrawer = new LinesDrawerPercentageWrap(this.linesDrawer);

			this.zoomedMMapPointsDrawer = null;
			if (this.data.isPercentage && this.data.isStacked)
				this.zoomedMMapPointsDrawer = new BarPolyDrawer();

			this.minmax = new PlainMinMaxSearcher();
			if (data.mainType == 'bar') this.minmax = new PlainZeroMinMaxSearcher();
			if (data.isStacked) this.minmax = new StackedMinMaxSearcher();
			if (data.isPercentage) this.minmax = new PercentageMinMaxSearcher();

			this.mmapLimitFunc = line => ({
				valueFrom: this.data.isPercentage
					? 0
					: Math.min(this.mmapLimit.valueFrom, line.yMin),
				valueTo: this.data.isPercentage
					? 100
					: Math.max(this.mmapLimit.valueTo, line.yMax),
			});
			this.mmapRightLimitFunc = line => ({
				valueFrom: this.data.rightScaledLines[0].yMin,
				valueTo: this.data.rightScaledLines[0].yMax, //TODO: тут бы правильный лимит нужен, но пока так
			});
		}

		_addDrawStartFeatures(yMax, iFrom, iTo, regionZoom) {
			if (this.data.isStacked && !this.data.isPercentage) {
				let visK = 1 + yMax / this.limit.valueTo / 4;
				this.linesDrawer.setCfgParam('visibilityCoeff', visK);

				let speedK = 1;
				for (let line of this.data.leftScaledLines) {
					let delta = Math.abs(line.visibility.value - line.visibility.valueDest);
					speedK = Math.min(speedK, 1 - delta);
				}
				speedK = Math.pow(speedK, 4);
				this.limit.speedCoeff = speedK;
			}
		}

		_addMinimapDrawStartFeatures() {
			if (this.data.isStacked)
				this.mmapLimit.resetTo(
					this.mmapLimit.valueFromDest,
					this.mmapLimit.valueToDest,
				);
		}

		_getAlpha(zoom, isPrimary) {
			return isPrimary ? Math.max(0, 1 - zoom * 1.5) : Math.max(0, zoom * 1.5 - 0.5)
		}

		detachLimits() {
			this.limit = this.limit.copy();
			if (this.data.doubleYScaled) this.rightLimit = this.rightLimit.copy();
		}

		resetLimits() {
			let [yMin, yMax] = this.minmax.getMinMaxGlobal(this.data.leftScaledLines);
			this.limit.resetTo(yMin, yMax);
			if (this.data.doubleYScaled) {
				let [yMin, yMax] = this.minmax.getMinMaxGlobal(this.data.rightScaledLines);
				this.rightLimit.resetTo(yMin, yMax);
			}
		}

		shouldCopyVisibilitiesFrom(part) {
			if (this.data.mainType != part.data.mainType) return false
			if (this.data.lines.length != part.data.lines.length) return false
			for (let code in this.data.lineByCode)
				if (!(code in part.data.lineByCode)) return false
			return true
		}

		setLineVisibilitiesBy(part) {
			if (this.shouldCopyVisibilitiesFrom(part)) {
				for (let code in part.data.lineByCode)
					if (code in this.data.lineByCode)
						this.data.lineByCode[code].visibility.resetTo(
							part.data.lineByCode[code].visibility.valueDest,
						);
			}
		}

		draw(rc, rect, view, xPosFrom, xPosTo, pointsPerPixel, regionZoom, isPrimary) {
			let iFrom = getIndexFromPosBinary(xPosFrom, this.data.xValues, 1);
			let iTo = getIndexFromPosBinary(xPosTo, this.data.xValues, 1);
			if (iTo < this.data.xValues.length - 1) iTo += 1;

			if (this.data.isPercentage) {
				iFrom = Math.max(1, iFrom - 10);
				iTo = Math.min(this.data.xValues.length - 1, iTo + 10);
			}

			let lines = this.data.leftScaledLines;
			let [yMin, yMax, yMaxDest] = this.minmax.getMinMaxPartial(lines, iFrom, iTo);
			//if ((zoom < 0.75 && isPrimary) || (zoom > 0.25 && !isPrimary)) {
			this.limit.setDest(roundYMin(yMin, yMax), roundYMax(yMaxDest));

			if (this.data.doubleYScaled) {
				let lines = this.data.rightScaledLines;
				let [yMin, yMax, yMaxDest] = this.minmax.getMinMaxPartial(lines, iFrom, iTo);
				this.rightLimit.setDest(roundYMin(yMin, yMax), roundYMax(yMaxDest));
			}
			//}

			let zoom = regionZoom.value;
			if (!this.data.isPercentage && this._getAlpha(zoom, isPrimary) == 0) return

			let curPointsPerPixel =
				(this.data.xValues.length * (view.xPosTo - view.xPosFrom)) / rect.width;
			if (zoom > 0.1 && zoom < 0.9) pointsPerPixel /= 2; //в процессе анимации можно отбросить часть точек, но ближе к концу и во взумленном сосотянии они на миникарте нужные все
			let reduction = curPointsPerPixel / pointsPerPixel;
			let k = 1.5;
			reduction = Math.pow(k, Math.round(Math.log(reduction * 2) / Math.log(k)));

			this.data.pointsDrawer.reset(rc, view, rect);

			if (this.onPartDrawStart) this.onPartDrawStart(this, iFrom, iTo);
			this._addDrawStartFeatures(yMax, iFrom, iTo, regionZoom.value);
			this.linesDrawer.setCfgParam('lineWidth', 2); // TODO: from config
			this.linesDrawer.setCfgParam('reduction', reduction);
			this.linesDrawer.setCfgParam('alpha', this._getAlpha(zoom, isPrimary));

			drawAllLinesWith(
				this.linesDrawer,
				this.data.pointsDrawer,
				this.data.xValues,
				this.data.leftScaledLines,
				iFrom,
				iTo,
				this.limit,
			);
			drawAllLinesWith(
				this.linesDrawer,
				this.data.pointsDrawer,
				this.data.xValues,
				this.data.rightScaledLines,
				iFrom,
				iTo,
				this.rightLimit,
			);

			this.data.pointsDrawer.allEnd();
		}

		drawMinimap(rc, rect, view, pointsPerPixel, regionZoom, isPrimary) {
			let iFrom = getIndexFromPosBinary(view.xPosFrom, this.data.xValues, 1);
			let iTo = getIndexFromPosBinary(view.xPosTo, this.data.xValues, 1);
			if (iTo < this.data.xValues.length - 1) iTo += 1;

			let zoom = regionZoom.value;
			if (!this.data.isPercentage && this._getAlpha(zoom, isPrimary) == 0) return

			let [yMin, yMax] = this.minmax.getMinMaxGlobal(this.data.leftScaledLines);
			this.mmapLimit.setDest(yMin, yMax);

			let pointsDrawer = this.data.pointsDrawer;
			if (zoom > 0 && this.zoomedMMapPointsDrawer != null) {
				pointsDrawer = this.zoomedMMapPointsDrawer;
				this.linesDrawer.setCfgParam('alpha', 1);
			}

			let curPointsPerPixel =
				(this.data.xValues.length * (view.xPosTo - view.xPosFrom)) / rect.width;
			if (zoom > 0.1 && zoom < 0.9) pointsPerPixel /= 2; //в процессе анимации можно отбросить часть точек, но ближе к концу и во взумленном сосотянии они на миникарте нужные все
			let reduction = curPointsPerPixel / pointsPerPixel;
			//if (!isPrimary) reduction *= Math.round(1 + (1 - Math.pow(zoom, 0.25)) * 10)
			let k = 1.5;
			reduction = Math.pow(k, Math.round(Math.log(reduction * 2) / Math.log(k)));

			pointsDrawer.reset(rc, view, rect);

			this._addMinimapDrawStartFeatures();
			this.linesDrawer.setCfgParam('lineWidth', 1.5); // TODO: from config
			this.linesDrawer.setCfgParam('reduction', reduction);

			drawAllLinesWith(
				this.linesDrawer,
				pointsDrawer,
				this.data.xValues,
				this.data.leftScaledLines,
				iFrom,
				iTo,
				this.mmapLimitFunc,
			);
			drawAllLinesWith(
				this.linesDrawer,
				pointsDrawer,
				this.data.xValues,
				this.data.rightScaledLines,
				iFrom,
				iTo,
				this.mmapRightLimitFunc,
			);

			pointsDrawer.allEnd();
		}
	}

	class TGChartChunkLoder {
		constructor({ requestZoomData, onChunkReady }) {
			this.requestZoomData = requestZoomData;
			this.onChunkReady = onChunkReady;
			this.chunks = {};
			this.lastKey = null;
		}

		_key(stamp) {
			return new Date(stamp).toISOString().substr(0, 10)
		}

		_respondIfNeed(chunk) {
			if (this.lastKey == chunk.key) this.onChunkReady(chunk);
		}

		fetchChunk(stamp) {
			let key = this._key(stamp);
			this.lastKey = key;

			if (!(key in this.chunks)) {
				let chunk = {
					key,
					stamp,
					data: null,
					isLoading: true,
					hasFailed: false,
					fetch: null,
				};
				chunk.fetch = this.requestZoomData(stamp)
					.then(data => {
						chunk.data = data;
						chunk.isLoading = false;
						this._respondIfNeed(chunk);
						// return new Promise((res, rej) => {
						// 	setTimeout(() => this._respondIfNeed(chunk), 400)
						// })
					})
					.catch(err => {
						chunk.isLoading = false;
						chunk.hasFailed = true;
						this._respondIfNeed(chunk);
					});
				this.chunks[key] = chunk;
				return
			}

			let chunk = this.chunks[key];
			if (!chunk.isLoading) {
				setTimeout(() => this._respondIfNeed(chunk), 0);
			}
		}

		forgetLastRequest() {
			this.lastKey = null;
		}
	}

	return Graph;

})();
