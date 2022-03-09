/******/ var __webpack_modules__ = ({

/***/ 424:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

// ESM COMPAT FLAG
__webpack_require__.r(__webpack_exports__);

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "TeyvatMap": () => (/* binding */ TeyvatMap)
});

// EXTERNAL MODULE: ./node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var jsxRuntime = __webpack_require__(871);
;// CONCATENATED MODULE: ./node_modules/locmap/src/map.js
/**
 * @typedef {{
 *   x2lon(x:number, zoom:number):number,
 *   y2lat(y:number, zoom:number):number,
 *   lon2x(lon:number, zoom:number):number,
 *   lat2y(lat:number, zoom:number):number,
 *   meters2pixCoef(lat:number, zoom:number):number,
 * }} ProjectionConverter
 */

/**
 * @template T
 * @typedef {(map:LocMap, params:T) => unknown} MapEventHandler
 */

/**
 * @typedef {{
 *   [K in keyof import('./common_types').MapEventHandlersMap]?:
 *     MapEventHandler<import('./common_types').MapEventHandlersMap[K]>
 * } & Record<string, MapEventHandler<any>>} MapEventHandlers
 */

/**
 * @typedef {{
 *   register?(map:LocMap): unknown,
 *   unregister?(map:LocMap): unknown,
 *   update?(map:LocMap): unknown,
 *   redraw?(map:LocMap): unknown,
 *   onEvent?: MapEventHandlers,
 * }} MapLayer
 */

/**
 * Core map engine. Manages location, layers and some transition animations.
 * @class
 * @param {HTMLElement} wrap main map element, should be relative/absolute for canvas to scale correctly
 * @param {ProjectionConverter} conv projection config, usually `ProjectionMercator`
 */
function LocMap(wrap, conv) {
	const rect = wrap.getBoundingClientRect()
	let curWidth = rect.width
	let curHeight = rect.height

	let lon = 0
	let lat = 0
	let zoom = 256
	let xShift = 0
	let yShift = 0
	let minZoom = 0
	let maxZoom = Infinity

	this.getLon = () => lon
	this.getLat = () => lat
	this.getZoom = () => zoom
	this.getProjConv = () => conv
	/**
	 * Map top-left edge offset from the view center (in pixels)
	 * @returns {[x:number, y:number]}
	 */
	this.getShift = () => [xShift, yShift]
	/** Returns current projection config */
	/**
	 * Map top-left edge offset from the view top-left edge (in pixels)
	 * @returns {[x:number, y:number]}
	 */
	this.getViewBoxShift = () => [xShift - curWidth / 2, yShift - curHeight / 2]
	/**
	 * Map view size
	 * @returns {[x:number, y:number]}
	 */
	this.getViewBoxSize = () => [curWidth, curHeight]

	/**
	 * Returns min and max zoom
	 * @returns {[min:number, max:number]}
	 */
	this.getZoomRange = () => [minZoom, maxZoom]
	/**
	 * Sets min and max zoom. Does not clamp current zoom.
	 * @param {number} min
	 * @param {number} max
	 */
	this.setZoomRange = (min, max) => {
		minZoom = min
		maxZoom = max
	}

	const canvas = document.createElement('canvas')
	canvas.className = 'locmap-canvas'
	canvas.style.position = 'absolute'
	canvas.style.left = '0'
	canvas.style.top = '0'
	canvas.style.width = '100%'
	canvas.style.height = '100%'
	wrap.appendChild(canvas)
	const rc = canvas.getContext('2d')

	this.getWrap = () => wrap
	this.getCanvas = () => canvas
	this.get2dContext = () => rc

	function pos_screen2map() {
		lon = conv.x2lon(xShift, zoom)
		lat = conv.y2lat(yShift, zoom)
	}
	function pos_map2screen() {
		xShift = conv.lon2x(lon, zoom)
		yShift = conv.lat2y(lat, zoom)
	}

	/** @param {number} lon */
	this.lon2x = lon => {
		return conv.lon2x(lon, zoom)
	}
	/** @param {number} lat */
	this.lat2y = lat => {
		return conv.lat2y(lat, zoom)
	}
	/** @param {number} lat */
	this.meters2pixCoef = lat => {
		return conv.meters2pixCoef(lat, zoom)
	}
	/** @param {number} x */
	this.x2lon = x => {
		return conv.x2lon(x, zoom)
	}
	/** @param {number} y */
	this.y2lat = y => {
		return conv.y2lat(y, zoom)
	}

	//----------
	// core
	//----------

	const layers = /** @type {MapLayer[]} */ ([])
	/** @param {MapLayer} layer */
	this.register = layer => {
		if (layers.includes(layer)) throw new Error('already registered')
		layers.push(layer)
		if (layer.register) layer.register(this)
	}
	/** @param {MapLayer} layer */
	this.unregister = layer => {
		const pos = layers.indexOf(layer)
		if (pos === -1) throw new Error('not registered yet')
		layers.splice(pos, 1)
		if (layer.unregister) layer.unregister(this)
	}
	/** @returns {readonly MapLayer[]} */
	this.getLayers = () => layers

	/**
	 * Instantly update map location and zoom.
	 * @param {number} lon_
	 * @param {number} lat_
	 * @param {number} zoom_
	 */
	this.updateLocation = (lon_, lat_, zoom_) => {
		lon = lon_
		lat = lat_
		zoom = zoom_
		pos_map2screen()
		updateLayers()
		requestRedraw()
	}

	const updateLayers = () => {
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			if (layer.update) layer.update(this)
		}
	}
	const drawLayers = () => {
		if (rc === null) return
		rc.clearRect(0, 0, canvas.width, canvas.height)
		rc.scale(devicePixelRatio, devicePixelRatio)
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			if (layer.redraw) layer.redraw(this)
		}
		rc.scale(1 / devicePixelRatio, 1 / devicePixelRatio)
	}

	const ZOOM_ANIM_MODE_SMOOTH = 0
	const ZOOM_ANIM_MODE_INERTIA = 1
	const zoomAnimationMinSpeed = 0.0001 //zoom_change/ms
	const zoomInertiaDeceleration = 0.993
	const zoomSmoothDeceleration = 0.983
	let zoomAnimationMode = /**@type {0|1}*/ (ZOOM_ANIM_MODE_SMOOTH)
	let zoomAnimationPrevStamp = 0
	let zoomAnimationX = 0
	let zoomAnimationY = 0
	let zoomAnimationDelta = 1

	const MOVE_ANIM_MODE_SMOOTH = 0
	const MOVE_ANIM_MODE_INERTIA = 1
	const moveInertiaDeceleration = 0.993 //relative speed decrease per 1ms
	const moveSmoothDeceleration = 0.985
	const moveAnimationMinSpeed = 0.01 //pixels/ms
	let moveAnimationMode = /**@type {0|1}*/ (MOVE_ANIM_MODE_SMOOTH)
	let moveAnimationPrevStamp = 0
	let moveAnimationX = 0
	let moveAnimationY = 0

	/** @param {number} frameTime */
	const smoothIfNecessary = frameTime => {
		const now = performance.now()

		if (Math.abs(zoomAnimationDelta - 1) > zoomAnimationMinSpeed) {
			const elapsed = now - zoomAnimationPrevStamp

			let dz
			if (zoomAnimationMode === ZOOM_ANIM_MODE_INERTIA) {
				dz = zoomAnimationDelta ** elapsed
				const inertiaK = zoomInertiaDeceleration ** elapsed
				zoomAnimationDelta = 1 + (zoomAnimationDelta - 1) * inertiaK
			} else {
				const smoothK = zoomSmoothDeceleration ** elapsed
				let newSmoothDelta = 1 + (zoomAnimationDelta - 1) * smoothK
				if (Math.abs(newSmoothDelta - 1) <= zoomAnimationMinSpeed) newSmoothDelta = 1
				dz = zoomAnimationDelta / newSmoothDelta
				zoomAnimationDelta = newSmoothDelta
			}

			this.zoom(zoomAnimationX, zoomAnimationY, dz)
			zoomAnimationPrevStamp = now
		}

		if (moveAnimationX ** 2 + moveAnimationY ** 2 > moveAnimationMinSpeed ** 2) {
			const elapsed = now - moveAnimationPrevStamp

			let dx, dy
			if (moveAnimationMode === MOVE_ANIM_MODE_INERTIA) {
				dx = moveAnimationX * elapsed
				dy = moveAnimationY * elapsed
				const k = moveInertiaDeceleration ** elapsed
				moveAnimationX *= k
				moveAnimationY *= k
			} else {
				let k = moveSmoothDeceleration ** elapsed
				let newX = moveAnimationX * k
				let newY = moveAnimationY * k
				if (newX ** 2 + newY ** 2 < moveAnimationMinSpeed ** 2) k = 0
				dx = moveAnimationX * (1 - k)
				dy = moveAnimationY * (1 - k)
				moveAnimationX *= k
				moveAnimationY *= k
			}

			this.move(dx, dy)
			moveAnimationPrevStamp = now
		}
	}

	let animFrameRequested = false
	function requestRedraw() {
		if (!animFrameRequested) {
			animFrameRequested = true
			requestAnimationFrame(onAnimationFrame)
		}
	}
	/** @param {number} frameTime */
	function onAnimationFrame(frameTime) {
		animFrameRequested = false
		smoothIfNecessary(frameTime)
		drawLayers()
	}
	/** Schedules map redraw (unless already scheduled). Can be safelyl called multiple times per frame. */
	this.requestRedraw = requestRedraw

	//-------------------
	// control inner
	//-------------------

	/**
	 * Should be called after map element (`wrap`) resize to update internal state and canvas.
	 */
	this.resize = () => {
		const rect = wrap.getBoundingClientRect()

		canvas.width = rect.width * devicePixelRatio
		canvas.height = rect.height * devicePixelRatio

		curWidth = rect.width
		curHeight = rect.height

		requestRedraw()
	}

	/**
	 * Zoom in `delta` times using `(x,y)` as a reference point
	 * (stays in place when zooming, usually mouse position).
	 * `0 < zoom < 1` for zoom out.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} delta
	 */
	this.zoom = (x, y, delta) => {
		const prevZoom = zoom
		zoom = mutlClamp(minZoom, maxZoom, zoom, delta)
		const actualDelta = zoom / prevZoom
		xShift += (-x + curWidth / 2 - xShift) * (1 - actualDelta)
		yShift += (-y + curHeight / 2 - yShift) * (1 - actualDelta)
		pos_screen2map()

		updateLayers()
		requestRedraw()
		this.emit('mapZoom', { x, y, delta })
	}

	/**
	 * Zoom in `delta` times smoothly using `(x,y)` as a reference point.
	 * Motion resembles `ease-out`, i.e. slowing down to the end.
	 * Useful for handling zoom buttons and mouse wheel.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} delta
	 * @param {number} stamp zoom start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.zoomSmooth = (x, y, delta, stamp) => {
		if (zoomAnimationMode !== ZOOM_ANIM_MODE_SMOOTH) zoomAnimationDelta = 1
		zoomAnimationDelta = mutlClamp(minZoom / zoom, maxZoom / zoom, zoomAnimationDelta, delta)
		zoomAnimationX = x
		zoomAnimationY = y
		zoomAnimationPrevStamp = stamp
		zoomAnimationMode = ZOOM_ANIM_MODE_SMOOTH
		smoothIfNecessary(stamp)
	}

	/**
	 * Move map view by `(dx,dy)` pixels.
	 * @param {number} dx
	 * @param {number} dy
	 */
	this.move = (dx, dy) => {
		xShift -= dx
		yShift -= dy
		pos_screen2map()

		updateLayers()
		requestRedraw()
		this.emit('mapMove', { dx, dy })
	}

	/**
	 * Move map view smoothly by `(dx,dy)` pixels.
	 * Motion resembles `ease-out`, i.e. slowing down to the end.
	 * Useful for handling move buttons.
	 * @param {number} dx
	 * @param {number} dy
	 * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.moveSmooth = (dx, dy, stamp) => {
		if (moveAnimationMode !== MOVE_ANIM_MODE_SMOOTH) moveAnimationX = moveAnimationY = 0
		moveAnimationX += dx
		moveAnimationY += dy
		moveAnimationPrevStamp = stamp
		moveAnimationMode = MOVE_ANIM_MODE_SMOOTH
		smoothIfNecessary(stamp)
	}

	/**
	 * Start moving map view with a certain speed and a gradual slowdown.
	 * Useful for mouse/touch handling.
	 * @param {number} dx horizontal speed in px/ms
	 * @param {number} dy vertival speed in px/ms
	 * @param {number} stamp move start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.applyMoveInertia = (dx, dy, stamp) => {
		moveAnimationX = dx
		moveAnimationY = dy
		moveAnimationPrevStamp = stamp
		moveAnimationMode = MOVE_ANIM_MODE_INERTIA
		smoothIfNecessary(stamp)
	}
	/**
	 * Start zoomin map with a certain speed and a gradual slowdown around `(x,y)` reference point.
	 * Useful for multitouch pinch-zoom handling.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} delta zoom speed, times per ms.
	 * @param {number} stamp zoom start time, usually `event.timeStamp` or `performance.now()`
	 */
	this.applyZoomInertia = (x, y, delta, stamp) => {
		zoomAnimationDelta = delta
		zoomAnimationX = x
		zoomAnimationY = y
		zoomAnimationPrevStamp = stamp
		zoomAnimationMode = ZOOM_ANIM_MODE_INERTIA
		smoothIfNecessary(stamp)
	}

	//------------
	// events
	//------------

	// TODO: if it could be overloaded, `K` may be `keyof MapEventHandlersMap`
	//       and editor will provide `name` completions (like with `addEventListener`)
	//       https://github.com/microsoft/TypeScript/issues/25590
	/**
	 * Emits a built-in (see {@linkcode MapEventHandlersMap}) or custom event with some arguments.
	 * @template {string} K
	 * @param {K} name
	 * @param {K extends keyof import('./common_types').MapEventHandlersMap
	 *           ? import('./common_types').MapEventHandlersMap[K]
	 *           : unknown} params
	 */
	this.emit = (name, params) => {
		for (let i = 0; i < layers.length; i++) {
			const layer = layers[i]
			const handler = layer.onEvent && layer.onEvent[name]
			if (handler) handler(this, params)
		}
	}

	//-----------
	// setup
	//-----------

	pos_map2screen()
}

/** @type {ProjectionConverter} */
const ProjectionFlat = {
	x2lon(x, zoom) {
		return x / zoom
	},
	y2lat(y, zoom) {
		return y / zoom
	},

	lon2x(lon, zoom) {
		return lon * zoom
	},
	lat2y(lat, zoom) {
		return lat * zoom
	},

	meters2pixCoef(lat, zoom) {
		return zoom
	},
}

/** @type {ProjectionConverter} */
const ProjectionMercator = {
	x2lon(x, z) {
		return (x / z) * 360 - 180
	},
	y2lat(y, z) {
		const n = Math.PI - (2 * Math.PI * y) / z
		return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
	},

	lon2x(lon, zoom) {
		return ((lon + 180) / 360) * zoom
	},
	lat2y(lat, zoom) {
		return (
			((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) /
				2) *
			zoom
		)
	},

	meters2pixCoef(lat, zoom) {
		lat *= Math.PI / 180
		return zoom / 40075000 / Math.abs(Math.cos(lat))
	},
}

/** @type {ProjectionConverter} */
const ProjectionYandexMercator = {
	// http://www.geofaq.ru/forum/index.php?action=vthread&forum=2&topic=7&page=5#msg1152
	// http://habrahabr.ru/post/151103/
	x2lon(x, zoom) {
		return (x / zoom) * 360 - 180
	},
	y2lat(y, zoom) {
		const ty = Math.exp((y / zoom) * Math.PI * 2 - Math.PI)
		const m = 5.328478445e-11
		const h = 1.764564338702e-8
		const k = 0.00000657187271079536
		const n = 0.003356551468879694
		const g = Math.PI / 2 - 2 * Math.atan(ty)
		// prettier-ignore
		const l = g + n*Math.sin(2*g) + k*Math.sin(4*g) + h*Math.sin(6*g) + m*Math.sin(8*g);
		return (l * 180) / Math.PI
	},

	lon2x(lon, zoom) {
		return ((lon + 180) / 360) * zoom
	},
	lat2y(lat, zoom) {
		const l = (lat * Math.PI) / 180
		const k = 0.0818191908426
		const t = k * Math.sin(l)
		// prettier-ignore
		return (
			1 -
			Math.log(
				Math.tan(Math.PI/4 + l/2)
			) / Math.PI +
			k*Math.log(
				Math.tan(
					Math.PI/4 +
					Math.asin(t)/2
				)
			) / Math.PI
		) / 2 * zoom
	},

	meters2pixCoef(lat, zoom) {
		lat *= Math.PI / 180
		return zoom / 40075000 / Math.abs(Math.cos(lat))
	},
}

/**
 * @param {number} min
 * @param {number} max
 * @param {number} val
 * @param {number} delta
 */
function mutlClamp(min, max, val, delta) {
	val *= delta
	if (delta < 1 && val < min) val = min
	if (delta > 1 && val > max) val = max
	return val
}

;// CONCATENATED MODULE: ./node_modules/js-control/src/index.js
/** @typedef {[EventTarget, string, (e:any) => void]} Evt */
/** @typedef {[allEents:Evt[], autoOnEvents:Evt[]]} EvtGroup */

/**
 * @template TElemsCfg
 * @typedef {{
 *   readonly isOn: boolean,
 *   on(elems: TElemsCfg): ControlToggler<TElemsCfg>,
 *   off(): ControlToggler<TElemsCfg>,
 * }} ControlToggler
 */

/**
 * @typedef {{
 *   singleDown?: (e:MouseEvent|TouchEvent, id:'mouse'|number, x:number, y:number) => boolean|void,
 *   singleMove?: (e:MouseEvent|TouchEvent, id:'mouse'|number, x:number, y:number) => void|boolean,
 *   singleUp?:   (e:MouseEvent|TouchEvent, id:'mouse'|number) => void|boolean,
 * }} SingleMoveCallbacks
 */

/**
 * @typedef {{
 *   singleHover?: (e:MouseEvent, x:number, y:number) => void|boolean,
 *   singleLeave?: (e:MouseEvent, x:number, y:number) => void|boolean,
 * }} SingleHoverCallbacks
 */

/**
 * @typedef {{
 *   singleDown?: (e:MouseEvent|TouchEvent, id:'mouse'|number, x:number, y:number, isSwitching:boolean) => boolean|void,
 *   singleMove?: (e:MouseEvent|TouchEvent, id:'mouse'|number, x:number, y:number) => void|boolean,
 *   singleUp?:   (e:MouseEvent|TouchEvent, id:'mouse'|number, isSwitching:boolean) => void|boolean,
 *   doubleDown?: (e:TouchEvent, id0:number, x0:number, y0:number, id1:number, x1:number, y1:number) => void|boolean,
 *   doubleMove?: (e:TouchEvent, id0:number, x0:number, y0:number, id1:number, x1:number, y1:number) => void|boolean,
 *   doubleUp?:   (e:TouchEvent, id0:number, id1:number) => void|boolean,
 * }} DoubleMoveCallbacks
 */

/**
 * @typedef {{
 *   wheelRot?: (e:WheelEvent, deltaX:number, deltaY:number, deltaZ:number, x:number, y:number) => void|boolean,
 * }} WheelCallbacks
 */

/**
 * @typedef {{
 *   startElem: Element,
 *   moveElem?: EventTarget|null,
 *   leaveElem?: EventTarget|null,
 *   offsetElem?: Element|null|'no-offset',
 * }} MoveElemsCfg
 */

/**
 * @typedef {{
 *   startElem: Element,
 *   offsetElem?: Element|null|'no-offset',
 * }} WheelElemsCfg
 */

/**
 * @param {SingleMoveCallbacks & SingleHoverCallbacks} callbacks
 */
function controlSingle(callbacks) {
	/** @type {Element} */ let startElem
	/** @type {EventTarget} */ let moveElem
	/** @type {EventTarget} */ let leaveElem
	/** @type {Element|null} */ let offsetElem

	/** @type {Evt} */ let mouseDownEvt
	/** @type {Evt} */ let mouseMoveEvt
	/** @type {Evt} */ let mouseUpEvt
	/** @type {Evt} */ let mouseHoverEvt
	/** @type {Evt} */ let mouseLeaveEvt
	/** @type {Evt} */ let touchStartEvt
	/** @type {Evt} */ let touchMoveEvt
	/** @type {Evt} */ let touchEndEvt
	/** @type {Evt} */ let touchCancelEvt

	const { singleDown = noop, singleMove = noop, singleUp = noop } = callbacks
	const { singleHover = noop, singleLeave = noop } = callbacks

	let touchId = /** @type {number|null} */ (null)

	const wrap = makeOffsetWrapper(() => offsetElem)

	const mousedown = wrap(function mousedown(/** @type {MouseEvent} */ e, dx, dy) {
		if (e.button !== 0) return false
		addListener(mouseMoveEvt)
		addListener(mouseUpEvt)
		removeListener(mouseHoverEvt)
		return singleDown(e, 'mouse', e.clientX + dx, e.clientY + dy)
	})

	const mousemove = wrap(function mousemove(/** @type {MouseEvent} */ e, dx, dy) {
		return singleMove(e, 'mouse', e.clientX + dx, e.clientY + dy)
	})

	const mouseup = wrap(function mouseup(/** @type {MouseEvent} */ e, dx, dy) {
		if (e.button !== 0) return false
		removeListener(mouseMoveEvt)
		removeListener(mouseUpEvt)
		addListener(mouseHoverEvt)
		return singleUp(e, 'mouse')
	})

	const mousemoveHover = wrap(function mousemoveHover(/** @type {MouseEvent} */ e, dx, dy) {
		return singleHover(e, e.clientX + dx, e.clientY + dy)
	})

	const mouseleave = wrap(function mouseleave(/** @type {MouseEvent} */ e, dx, dy) {
		return singleLeave(e, e.clientX + dx, e.clientY + dy)
	})

	const touchstart = wrap(function touchstart(/** @type {TouchEvent} */ e, dx, dy) {
		if (touchId !== null) return false

		addListener(touchMoveEvt)
		addListener(touchEndEvt)
		addListener(touchCancelEvt)

		const t = e.changedTouches[0]
		touchId = t.identifier
		return singleDown(e, touchId, t.clientX + dx, t.clientY + dy)
	})

	const touchmove = wrap(function touchmove(/** @type {TouchEvent} */ e, dx, dy) {
		if (touchId === null) return false
		const touch = findTouch(e.changedTouches, touchId)
		if (touch === null) return false
		return singleMove(e, touchId, touch.clientX + dx, touch.clientY + dy)
	})

	const touchend = wrap(function touchend(/** @type {TouchEvent} */ e, dx, dy) {
		if (touchId === null) return false

		const releasedTouch = findTouch(e.changedTouches, touchId)
		if (releasedTouch === null) return false

		touchId = null

		removeListener(touchMoveEvt)
		removeListener(touchEndEvt)
		removeListener(touchCancelEvt)

		return singleUp(e, releasedTouch.identifier)
	})

	const touchcancel = wrap(function touchcancel(/** @type {TouchEvent} */ e, dx, dy) {
		touchend(e)
	})

	return makeEventsToggler((/**@type {MoveElemsCfg}*/ elems) => {
		startElem = elems.startElem
		moveElem = elems.moveElem ?? window
		leaveElem = elems.leaveElem ?? startElem
		offsetElem = nullUnlessOffset(elems.offsetElem, startElem)

		mouseDownEvt = /** @type {Evt} */ ([startElem, 'mousedown', mousedown])
		mouseMoveEvt = /** @type {Evt} */ ([moveElem, 'mousemove', mousemove])
		mouseUpEvt = /** @type {Evt} */ ([moveElem, 'mouseup', mouseup])
		mouseHoverEvt = /** @type {Evt} */ ([moveElem, 'mousemove', mousemoveHover])
		mouseLeaveEvt = /** @type {Evt} */ ([leaveElem, 'mouseleave', mouseleave])
		touchStartEvt = /** @type {Evt} */ ([startElem, 'touchstart', touchstart])
		touchMoveEvt = /** @type {Evt} */ ([moveElem, 'touchmove', touchmove])
		touchEndEvt = /** @type {Evt} */ ([moveElem, 'touchend', touchend])
		touchCancelEvt = /** @type {Evt} */ ([moveElem, 'touchcancel', touchcancel])

		// prettier-ignore
		const events = [
			mouseDownEvt, mouseMoveEvt, mouseUpEvt, mouseHoverEvt, mouseLeaveEvt,
			touchStartEvt, touchMoveEvt, touchEndEvt, touchCancelEvt,
		]
		const autoOnEvents = [mouseDownEvt, touchStartEvt, mouseHoverEvt, mouseLeaveEvt]
		return [events, autoOnEvents]
	})
}

/**
 * @param {WheelCallbacks} callbacks
 */
function controlWheel(callbacks) {
	const wheelRot = callbacks.wheelRot ?? noop

	/** @type {Element|null} */ let offsetElem

	const wrap = makeOffsetWrapper(() => offsetElem)
	const mousewheel = makeWheelListener(wrap, wheelRot)

	return makeEventsToggler((/**@type {WheelElemsCfg}*/ elems) => {
		const startElem = elems.startElem
		offsetElem = nullUnlessOffset(elems.offsetElem, startElem)

		const wheelEvt = /** @type {Evt} */ ([startElem, 'wheel', mousewheel])

		return [[wheelEvt], [wheelEvt]]
	})
}

/**
 * @param {DoubleMoveCallbacks & SingleHoverCallbacks & WheelCallbacks} callbacks
 */
function controlDouble(callbacks) {
	/** @type {Element} */ let startElem
	/** @type {EventTarget} */ let moveElem
	/** @type {EventTarget} */ let leaveElem
	/** @type {Element|null} */ let offsetElem

	/** @type {Evt} */ let mouseDownEvt
	/** @type {Evt} */ let mouseMoveEvt
	/** @type {Evt} */ let mouseUpEvt
	/** @type {Evt} */ let wheelEvt
	/** @type {Evt} */ let mouseHoverEvt
	/** @type {Evt} */ let mouseLeaveEvt
	/** @type {Evt} */ let touchStartEvt
	/** @type {Evt} */ let touchMoveEvt
	/** @type {Evt} */ let touchEndEvt
	/** @type {Evt} */ let touchCancelEvt

	const { singleDown = noop, singleMove = noop, singleUp = noop } = callbacks
	const { doubleDown = noop, doubleMove = noop, doubleUp = noop } = callbacks
	const { singleHover = noop, singleLeave = noop, wheelRot = noop } = callbacks

	const touchIds = /** @type {number[]} */ ([])

	const wrap = makeOffsetWrapper(() => offsetElem)

	const mousedown = wrap(function mousedown(/** @type {MouseEvent} */ e, dx, dy) {
		if (e.button !== 0) return false
		addListener(mouseMoveEvt)
		addListener(mouseUpEvt)
		removeListener(mouseHoverEvt)
		return singleDown(e, 'mouse', e.clientX + dx, e.clientY + dy, false)
	})

	const mousemove = wrap(function mousemove(/** @type {MouseEvent} */ e, dx, dy) {
		return singleMove(e, 'mouse', e.clientX + dx, e.clientY + dy)
	})

	const mouseup = wrap(function mouseup(/** @type {MouseEvent} */ e, dx, dy) {
		if (e.button !== 0) return false
		removeListener(mouseMoveEvt)
		removeListener(mouseUpEvt)
		addListener(mouseHoverEvt)
		return singleUp(e, 'mouse', false)
	})

	const mousemoveHover = wrap(function mousemoveHover(/** @type {MouseEvent} */ e, dx, dy) {
		return singleHover(e, e.clientX + dx, e.clientY + dy)
	})

	const mouseleave = wrap(function mouseleave(/** @type {MouseEvent} */ e, dx, dy) {
		return singleLeave(e, e.clientX + dx, e.clientY + dy)
	})

	const touchstart = wrap(function touchstart(/** @type {TouchEvent} */ e, dx, dy) {
		const curCount = touchIds.length
		if (curCount === 2) return false
		const changedTouches = e.changedTouches

		if (curCount === 0) {
			addListener(touchMoveEvt)
			addListener(touchEndEvt)
			addListener(touchCancelEvt)
		}

		if (curCount === 0 && changedTouches.length === 1) {
			const t = e.changedTouches[0]
			touchIds.push(t.identifier)
			return singleDown(e, touchIds[0], t.clientX + dx, t.clientY + dy, false)
		}

		let t0, t1
		let prevent = /**@type {void|boolean}*/ (false)
		if (curCount === 0) {
			// and changedTouches.length >= 2
			t0 = changedTouches[0]
			t1 = changedTouches[1]
			touchIds.push(t0.identifier)
			prevent = singleDown(e, t0.identifier, t0.clientX + dx, t0.clientY + dy, false)
		} else {
			// curCount === 1 and changedTouches.length >= 1
			t0 = mustFindTouch(e.touches, touchIds[0])
			t1 = e.changedTouches[0]
		}
		touchIds.push(t1.identifier)
		const prevetUp = singleUp(e, t0.identifier, true)
		prevent = prevent || prevetUp

		const x0 = t0.clientX + dx
		const y0 = t0.clientY + dy
		const x1 = t1.clientX + dx
		const y1 = t1.clientY + dy
		const preventDouble = doubleDown(e, touchIds[0], x0, y0, touchIds[1], x1, y1)
		return prevent || preventDouble
	})

	const touchmove = wrap(function touchmove(/** @type {TouchEvent} */ e, dx, dy) {
		const curCount = touchIds.length
		if (curCount === 1) {
			const t0 = findTouch(e.changedTouches, touchIds[0])
			if (t0 === null) return false
			return singleMove(e, touchIds[0], t0.clientX + dx, t0.clientY + dy)
		}
		if (curCount === 2) {
			// can not use e.changedTouches: one of touches may have not changed
			const t0 = mustFindTouch(e.touches, touchIds[0])
			const t1 = mustFindTouch(e.touches, touchIds[1])
			const x0 = t0.clientX + dx
			const y0 = t0.clientY + dy
			const x1 = t1.clientX + dx
			const y1 = t1.clientY + dy
			return doubleMove(e, touchIds[0], x0, y0, touchIds[1], x1, y1)
		}
	})

	const releasedTouches = /** @type {Touch[]} */ ([])
	const touchend = wrap(function touchend(/** @type {TouchEvent} */ e, dx, dy) {
		const curCount = touchIds.length
		if (curCount === 0) return false

		const tid0 = touchIds[0]
		const tid1 = touchIds[1]

		releasedTouches.length = 0
		for (let j = touchIds.length - 1; j >= 0; j--) {
			for (let i = 0; i < e.changedTouches.length; i++) {
				const t = e.changedTouches[i]
				if (t.identifier === touchIds[j]) {
					touchIds.splice(j, 1)
					releasedTouches.push(t)
					break
				}
			}
		}
		if (releasedTouches.length === 0) return false

		if (curCount === releasedTouches.length) {
			removeListener(touchMoveEvt)
			removeListener(touchEndEvt)
			removeListener(touchCancelEvt)
		}

		if (curCount === 1) {
			// and releasedTouches.length === 1
			return singleUp(e, releasedTouches[0].identifier, false)
		}

		// curCount === 2 and releasedTouches.length >= 1
		const tLast =
			releasedTouches.length === 1 ? mustFindTouch(e.touches, touchIds[0]) : releasedTouches[1]

		const preventUp2 = doubleUp(e, tid0, tid1)
		const preventDown1 = singleDown(e, tLast.identifier, tLast.clientX + dx, tLast.clientY + dy, true)
		let preventUp1 = /**@type {void|boolean}*/ (false)
		if (curCount === 2 && releasedTouches.length === 2) {
			preventUp1 = singleUp(e, tLast.identifier, false)
		}
		return preventUp2 || preventDown1 || preventUp1
	})

	const touchcancel = wrap(function touchcancel(/** @type {TouchEvent} */ e, dx, dy) {
		touchend(e)
	})

	const mousewheel = makeWheelListener(wrap, wheelRot)

	return makeEventsToggler((/**@type {MoveElemsCfg}*/ elems) => {
		startElem = elems.startElem
		moveElem = elems.moveElem ?? window
		leaveElem = elems.leaveElem ?? startElem
		offsetElem = nullUnlessOffset(elems.offsetElem, startElem)

		mouseDownEvt = /** @type {Evt} */ ([startElem, 'mousedown', mousedown])
		mouseMoveEvt = /** @type {Evt} */ ([moveElem, 'mousemove', mousemove])
		mouseUpEvt = /** @type {Evt} */ ([moveElem, 'mouseup', mouseup])
		wheelEvt = /** @type {Evt} */ ([startElem, 'wheel', mousewheel])
		mouseHoverEvt = /** @type {Evt} */ ([moveElem, 'mousemove', mousemoveHover])
		mouseLeaveEvt = /** @type {Evt} */ ([leaveElem, 'mouseleave', mouseleave])
		touchStartEvt = /** @type {Evt} */ ([startElem, 'touchstart', touchstart])
		touchMoveEvt = /** @type {Evt} */ ([moveElem, 'touchmove', touchmove])
		touchEndEvt = /** @type {Evt} */ ([moveElem, 'touchend', touchend])
		touchCancelEvt = /** @type {Evt} */ ([moveElem, 'touchcancel', touchcancel])

		// prettier-ignore
		const events = [
			mouseDownEvt, mouseMoveEvt, mouseUpEvt, mouseHoverEvt, mouseLeaveEvt, wheelEvt,
			touchStartEvt, touchMoveEvt, touchEndEvt, touchCancelEvt,
		]
		const autoOnEvents = [mouseDownEvt, touchStartEvt, mouseHoverEvt, mouseLeaveEvt, wheelEvt]
		return [events, autoOnEvents]
	})
}

function noop() {}

/**
 * @param {() => Element|null|undefined} getOffsetElem
 */
function makeOffsetWrapper(getOffsetElem) {
	/**
	 * @template {Event} T
	 * @param {(e:T, x:number, y:number) => boolean|void} func
	 * @returns {(e:T) => void}
	 */
	function wrap(func) {
		return e => {
			let dx = 0
			let dy = 0
			const elem = getOffsetElem()
			if (elem) ({ left: dx, top: dy } = elem.getBoundingClientRect())
			func(e, -dx, -dy) && e.preventDefault()
		}
	}
	return wrap
}

/**
 * @param {Element|null|undefined|'no-offset'} elem
 * @param {Element} defaultElem
 */
function nullUnlessOffset(elem, defaultElem) {
	if (elem === 'no-offset') return null
	return elem ?? defaultElem
}

/**
 * @param {(func: (e:WheelEvent, x:number, y:number) => boolean|void) => ((e:WheelEvent) => void)} wrap
 * @param {(e:WheelEvent, deltaX:number, deltaY:number, deltaZ:number, x:number, y:number) => void|boolean} wheelRot
 */
function makeWheelListener(wrap, wheelRot) {
	const deltaMode2pixels = []
	deltaMode2pixels[WheelEvent.DOM_DELTA_PIXEL] = 1
	deltaMode2pixels[WheelEvent.DOM_DELTA_LINE] = 20
	deltaMode2pixels[WheelEvent.DOM_DELTA_PAGE] = 50 // а это вообще как?
	return wrap(function mousewheel(/** @type {WheelEvent} */ e, dx, dy) {
		const k = deltaMode2pixels[e.deltaMode]
		return wheelRot(e, e.deltaX * k, e.deltaY * k, e.deltaZ * k, e.clientX + dx, e.clientY + dy)
	})
}

/**
 * @template TElemsCfg
 * @param {(elems: TElemsCfg) => EvtGroup} getEvents
 * @returns {ControlToggler<TElemsCfg>}
 */
function makeEventsToggler(getEvents) {
	let events = /**@type {(EvtGroup|null)}*/ (null)

	return {
		get isOn() {
			return !!events
		},
		on(elems) {
			if (!events) {
				events = getEvents(elems)
				const autoOnEvents = events[1]
				autoOnEvents.map(addListener)
			}
			return this
		},
		off() {
			if (events) {
				const allEents = events[0]
				allEents.map(removeListener)
				events = null
			}
			return this
		},
	}
}

/**
 * @param {TouchList} list
 * @param {number} id
 */
function findTouch(list, id) {
	for (let i = 0; i < list.length; i++) if (list[i].identifier === id) return list[i]
	return null
}
/**
 * @param {TouchList} list
 * @param {number} id
 */
function mustFindTouch(list, id) {
	const touch = findTouch(list, id)
	if (touch === null) throw new Error(`touch #${id} not found`)
	return touch
}

/** @param {Evt} event */
function addListener(event) {
	event[0].addEventListener(event[1], event[2], { capture: true, passive: false })
}

/** @param {Evt} event */
function removeListener(event) {
	event[0].removeEventListener(event[1], event[2], { capture: true })
}

;// CONCATENATED MODULE: ./node_modules/locmap/src/utils.js
/**
 * Chooses and returns random argument.
 * @template T
 * @param  {...T} args
 * @returns {T}
 */
function oneOf(...args) {
	return args[(args.length * Math.random()) | 0]
}

/** @type {Partial<CSSStyleDeclaration>} */
const CREDIT_BOTTOM_RIGHT = {
	position: 'absolute',
	right: '0',
	bottom: '0',
	font: '11px/1.5 sans-serif',
	background: 'white',
	padding: '0 5px',
	opacity: '0.75',
}

/**
 * Shortcut for appending some HTML at the right-bottom of another element.
 * @param {HTMLElement} wrap parent element, usually `map.getWrap()`
 * @param {string} html content as HTML (won't be escaped)
 * @param {Partial<CSSStyleDeclaration>} [style=CREDIT_BOTTOM_RIGHT] custom style object
 */
function appendCredit(wrap, html, style = CREDIT_BOTTOM_RIGHT) {
	const elem = document.createElement('div')
	elem.className = 'map-credit'
	elem.innerHTML = html
	utils_applyStyles(elem, style)
	wrap.appendChild(elem)
}

/**
 * @param {number} a
 * @param {number} b
 * @param {number} x
 */
function clamp(a, b, x) {
	return Math.max(a, Math.min(b, x))
}

/**
 * @param {HTMLElement} elem
 * @param {Partial<CSSStyleDeclaration>} style
 */
function utils_applyStyles(elem, style) {
	for (const name in style) elem.style[name] = /**@type {string}*/ (style[name])
}

;// CONCATENATED MODULE: ./node_modules/locmap/src/control_layer.js



/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 */
function point_distance(x1, y1, x2, y2) {
	return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1))
}

/**
 * Returns `attr` speed prediction for `timeStamp` moment by
 * calculating acceleration of values `items[i][attr]` (with linear approximation).
 * @param {{stamp:number}[]} items
 * @param {string} attr
 * @param {number} timeStamp
 */
function getApproximatedSpeed(items, attr, timeStamp) {
	// https://prog-cpp.ru/mnk/
	let sumx = 0
	let sumy = 0
	let sumx2 = 0
	let sumxy = 0
	let n = 0
	const len = items.length
	const now = performance.now()
	const last = items[len - 1]
	let cur = last
	for (let i = len - 1; i > 0; i--) {
		const prev = items[i - 1]
		if (now - prev.stamp > 150) break
		const dtime = cur.stamp - prev.stamp
		const dattr = cur[attr] - prev[attr]
		if (dtime === 0) continue

		const x = cur.stamp
		const y = /**@type {number}*/ (dattr / dtime)
		sumx += x
		sumy += y
		sumx2 += x * x
		sumxy += x * y
		n++
		cur = prev
	}

	if (n === 1) {
		// Got only two usable items (the last movement was too short),
		// just returning average speed between them.
		const dtime = last.stamp - cur.stamp
		const dattr = last[attr] - cur[attr]
		if (dtime < 4) return 0 //in case events are too close or have the same time
		return dattr / dtime
	}
	if (n === 0) return 0

	const aDenom = n * sumx2 - sumx * sumx
	if (aDenom === 0) return 0
	const a = (n * sumxy - sumx * sumy) / aDenom
	const b = (sumy - a * sumx) / n
	let k = a * timeStamp + b

	const dattr = last[attr] - cur[attr]
	if (k * dattr < 0) k = 0 //if acceleration changes the sign (i.e. flips direction), movement should be stopped
	return k
}

/**
 * "default timing in Windows is 500ms" https://stackoverflow.com/a/29917394
 */
const DBL_CLICK_MAX_DELAY = 500

/**
 * Enables mouse and touch input: gragging, wheel- and pinch-zooming.
 * @class
 * @param {{doNotInterfere?:boolean}} [opts]
 */
function PointerControlLayer(opts) {
	const { doNotInterfere } = opts || {}
	/** @type {{off():unknown}} */
	let control

	let mouseX = 0
	let mouseY = 0

	let moveDistance = 0
	let lastSingleClickAt = 0
	let lastDoubleTouchParams = /**@type {[number,number,number,number,number,number]|null}*/ (null)

	let lastDoubleTouch_cx = 0
	let lastDoubleTouch_cy = 0
	let lastDoubleTouch_dx = 0
	let lastDoubleTouch_dy = 0
	let lastDoubleTouch_dist = 1
	let lastDoubleTouch_stamp = 0

	let lastMoves = [{ x: 0, y: 0, stamp: 0 }]
	let lastZooms = [{ dist: 0, stamp: 0 }]
	for (const arr of [lastMoves, lastZooms])
		while (arr.length < 5) arr.push(Object.assign({}, /**@type {*}*/ (arr[0])))

	/**
	 * If stamp is new, pops the first array element, pushes in back and returns it.
	 * If stamp is same, just returns the last array element.
	 * Useful for Safari (and maybe some others) where sometimes a bunch of touch events
	 * come with same timeStamp. In that case we should just update last element, not push anything.
	 * @template {{stamp:number}} T
	 * @param {T[]} arr
	 * @param {number} stamp
	 * @returns {T}
	 */
	function peekOrShift(arr, stamp) {
		const last = arr[arr.length - 1]
		if (last.stamp === stamp) return last
		const newLast = /** @type {*} */ (arr.shift())
		arr.push(newLast)
		return newLast
	}
	/** @param {number} stamp */
	function recordMousePos(stamp) {
		const last = peekOrShift(lastMoves, stamp)
		last.x = mouseX
		last.y = mouseY
		last.stamp = stamp
	}
	/** Shifts all lastMoves so that the last recorded move will be at mouse(x,y) */
	function moveRecordedMousePos() {
		const last = lastMoves[lastMoves.length - 1]
		const dx = mouseX - last.x
		const dy = mouseY - last.y
		for (let i = 0; i < lastMoves.length; i++) {
			lastMoves[i].x += dx
			lastMoves[i].y += dy
		}
	}
	/** @param {number} stamp */
	function recordTouchDist(stamp) {
		const last = peekOrShift(lastZooms, stamp)
		last.dist = lastDoubleTouch_dist
		last.stamp = stamp
	}
	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} timeStamp
	 */
	function applyInertia(map, timeStamp) {
		const dx = getApproximatedSpeed(lastMoves, 'x', timeStamp)
		const dy = getApproximatedSpeed(lastMoves, 'y', timeStamp)
		const dz = getApproximatedSpeed(lastZooms, 'dist', timeStamp) / lastDoubleTouch_dist + 1
		map.applyMoveInertia(dx, dy, lastMoves[lastMoves.length - 1].stamp)
		map.applyZoomInertia(mouseX, mouseY, dz, lastZooms[lastZooms.length - 1].stamp)
	}

	/**
	 * Sets mouse(x,y) to (x,y) with special post-double-touch correction.
	 *
	 * Two fingers do not lift simultaneously, so there is (almost) always two-touches -> one-touch -> no touch.
	 * This may cause a problem if two touches move in opposite directions (zooming):
	 * while they both are down, there is a little movement,
	 * but when first touch lift, second (still down) starts to move map aside with significant speed.
	 * Then second touch lifts too and speed reduces again (because of smoothing and inertia).
	 * All that makes motion at the end of zoom gesture looks trembling.
	 *
	 * This function tries to fix that by continuing double-touch motion for a while.
	 * Used only for movement: zooming should remain smooth thanks to applyInertia() at the end of doubleUp().
	 * @param {number} x
	 * @param {number} y
	 * @param {number} stamp
	 */
	function setCorrectedSinglePos(x, y, stamp) {
		const timeDelta = stamp - lastDoubleTouch_stamp
		const duration = 150
		const k = clamp(0, 1, ((duration - timeDelta) / duration) * 2)
		mouseX = (lastDoubleTouch_cx + lastDoubleTouch_dx * timeDelta) * k + x * (1 - k)
		mouseY = (lastDoubleTouch_cy + lastDoubleTouch_dy * timeDelta) * k + y * (1 - k)
	}

	/**
	 * For some reason FF return same touchMove event for each touch
	 * (two events with same timeStamps and coords for two touches, thee for thee, etc.)
	 * @param {number} centerX
	 * @param {number} centerY
	 * @param {number} distance
	 * @param {number} stamp
	 */
	function doubleMoveHasChanged(centerX, centerY, distance, stamp) {
		return (
			mouseX !== centerX ||
			mouseY !== centerY ||
			lastDoubleTouch_dist !== distance ||
			lastMoves[lastMoves.length - 1].stamp !== stamp
		)
	}

	/**
	 * @param {MouseEvent|TouchEvent} e
	 * @param {'mouse'|number} id
	 */
	function shouldShowTwoFingersHint(e, id) {
		return doNotInterfere && id !== 'mouse' && e.timeStamp - lastDoubleTouch_stamp > 1000
	}

	/** @param {import('./map').LocMap} map */
	const makeControl = map => {
		const canvas = map.getCanvas()
		canvas.style.cursor = 'grab'

		return controlDouble({
			singleDown(e, id, x, y, isSwitching) {
				if (shouldShowTwoFingersHint(e, id)) return false
				map.getWrap().focus()
				setCorrectedSinglePos(x, y, e.timeStamp)
				if (isSwitching) moveRecordedMousePos()
				if (!isSwitching) {
					recordMousePos(e.timeStamp)
					map.applyMoveInertia(0, 0, 0)
					map.applyZoomInertia(0, 0, 1, 0)
					moveDistance = 0
					lastDoubleTouchParams = null
				}
				map.emit('singleDown', { x, y, id, isSwitching })
				canvas.style.cursor = 'grabbing'
				return true
			},
			singleMove(e, id, x, y) {
				if (shouldShowTwoFingersHint(e, id)) {
					map.emit('controlHint', { type: 'use_two_fingers' })
					return false
				}
				const oldX = mouseX
				const oldY = mouseY
				setCorrectedSinglePos(x, y, e.timeStamp)
				moveDistance += point_distance(oldX, oldY, mouseX, mouseY)
				map.move(mouseX - oldX, mouseY - oldY)
				recordMousePos(e.timeStamp)
				map.emit('singleMove', { x, y, id })
				return true
			},
			singleUp(e, id, isSwitching) {
				const stamp = e.timeStamp
				if (!isSwitching) applyInertia(map, stamp)
				map.emit('singleUp', { x: mouseX, y: mouseY, id, isSwitching })
				if (moveDistance < 5 && !isSwitching) {
					if (lastDoubleTouchParams) {
						map.zoomSmooth(mouseX, mouseY, 0.5, stamp)
						const [id0, x0, y0, id1, x1, y1] = lastDoubleTouchParams
						map.emit('doubleClick', { id0, x0, y0, id1, x1, y1 })
					} else {
						const isDbl = lastSingleClickAt > stamp - DBL_CLICK_MAX_DELAY
						lastSingleClickAt = stamp
						if (isDbl) map.zoomSmooth(mouseX, mouseY, 2, stamp)
						map.emit(isDbl ? 'dblClick' : 'singleClick', { x: mouseX, y: mouseY, id })
					}
				}
				canvas.style.cursor = 'grab'
				return true
			},
			doubleDown(e, id0, x0, y0, id1, x1, y1) {
				mouseX = (x0 + x1) * 0.5
				mouseY = (y0 + y1) * 0.5
				lastDoubleTouch_dist = point_distance(x0, y0, x1, y1)
				lastDoubleTouch_cx = mouseX
				lastDoubleTouch_cy = mouseY
				moveRecordedMousePos()
				lastDoubleTouchParams = [id0, x0, y0, id1, x1, y1]
				map.emit('doubleDown', { id0, x0, y0, id1, x1, y1 })
				return true
			},
			doubleMove(e, id0, x0, y0, id1, x1, y1) {
				const cx = (x0 + x1) * 0.5
				const cy = (y0 + y1) * 0.5
				const cd = point_distance(x0, y0, x1, y1)
				if (doubleMoveHasChanged(cx, cy, cd, e.timeStamp)) {
					map.move(cx - mouseX, cy - mouseY)
					map.zoom(cx, cy, cd / lastDoubleTouch_dist)
					moveDistance +=
						point_distance(mouseX, mouseY, cx, cy) + Math.abs(cd - lastDoubleTouch_dist)
					lastDoubleTouchParams = [id0, x0, y0, id1, x1, y1]
					mouseX = cx
					mouseY = cy
					lastDoubleTouch_dist = cd
					lastDoubleTouch_cx = cx
					lastDoubleTouch_cy = cy
					recordMousePos(e.timeStamp)
					recordTouchDist(e.timeStamp)
					map.emit('doubleMove', { id0, x0, y0, id1, x1, y1 })
				}
				return true
			},
			doubleUp(e, id0, id1) {
				const stamp = e.timeStamp
				lastDoubleTouch_dx = getApproximatedSpeed(lastMoves, 'x', stamp)
				lastDoubleTouch_dy = getApproximatedSpeed(lastMoves, 'y', stamp)
				lastDoubleTouch_stamp = e.timeStamp
				map.emit('doubleUp', { id0, id1 })
				return true
			},
			wheelRot(e, deltaX, deltaY, deltaZ, x, y) {
				if (!doNotInterfere || e.ctrlKey || e.metaKey) {
					map.zoomSmooth(x, y, Math.pow(2, -deltaY / 240), e.timeStamp)
					return true
				} else {
					map.emit('controlHint', { type: 'use_control_to_zoom' })
					return false
				}
			},
			singleHover(e, x, y) {
				map.emit('singleHover', { x, y })
			},
		}).on({
			// not map.getWrap(): so this layer will not prevent events from reaching other layers
			startElem: canvas,
		})
	}

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		control = makeControl(map)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		control.off()
	}
}

/**
 * Enables keyboard controls: arrows for movement, +/- for zoom. Shift can be used for speedup.
 * Makes map element focusable.
 * @class
 * @param {object} [opts]
 * @param {string|null} [opts.outlineFix] value that will be set to `map.getWrap().style.outline`.
 *   It's a workaround for mobile Safari 14 (at least) bug where `canvas` performance
 *   drops significantly after changing parent `tabIndex` attribute.
 *   'none' (default) seems fixing the issue.
 */
function KeyboardControlLayer(opts) {
	const { outlineFix = 'none' } = opts || {}
	/** @type {(e:KeyboardEvent) => unknown} */
	let handler
	let oldTabIndex = -1

	/** @param {import('./map').LocMap} map */
	const makeHandler = map => (/**@type {KeyboardEvent}*/ e) => {
		if (e.ctrlKey || e.altKey) return

		let shouldPrevent = true
		const { key, shiftKey, timeStamp } = e
		const { width, height } = map.getCanvas()
		const moveDelta = 75 * (shiftKey ? 3 : 1)
		const zoomDelta = 2 * (shiftKey ? 2 : 1)

		if (key === 'ArrowUp') {
			map.moveSmooth(0, moveDelta, timeStamp)
		} else if (key === 'ArrowDown') {
			map.moveSmooth(0, -moveDelta, timeStamp)
		} else if (key === 'ArrowLeft') {
			map.moveSmooth(moveDelta, 0, timeStamp)
		} else if (key === 'ArrowRight') {
			map.moveSmooth(-moveDelta, 0, timeStamp)
		} else if (key === '=' || key === '+') {
			map.zoomSmooth(width / 2, height / 2, zoomDelta, timeStamp)
		} else if (key === '-' || key === '_') {
			map.zoomSmooth(width / 2, height / 2, 1 / zoomDelta, timeStamp)
		} else {
			shouldPrevent = false
		}

		if (shouldPrevent) e.preventDefault()
	}

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		const wrap = map.getWrap()
		oldTabIndex = wrap.tabIndex
		wrap.tabIndex = 1
		if (outlineFix !== null) wrap.style.outline = outlineFix
		handler = makeHandler(map)
		wrap.addEventListener('keydown', handler)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		const wrap = map.getWrap()
		wrap.tabIndex = oldTabIndex
		wrap.removeEventListener('keydown', handler)
	}
}

/**
 * Layer for pointer (mouse/touch) and keyboard input.
 * See {@linkcode PointerControlLayer} and {@linkcode KeyboardControlLayer}.
 * @class
 * @param {Parameters<typeof PointerControlLayer>[0]} [mouseOpts]
 * @param {Parameters<typeof KeyboardControlLayer>[0]} [kbdOpts]
 */
function ControlLayer(mouseOpts, kbdOpts) {
	const items = [new PointerControlLayer(mouseOpts), new KeyboardControlLayer(kbdOpts)]

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		for (const item of items) item.register(map)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		for (const item of items) item.unregister(map)
	}
}

/**
 * Should be used with `doNotInterfere:true` set on {@linkcode MouseControlLayer} or {@linkcode ControlLayer}.
 * Shows a text over the map when user input is ignored.
 * @class
 * @param {string} controlText text to be shown when `Ctrl`/`⌘` key is required to zoom.
 *   For example: `` `hold ${controlHintKeyName()} to zoom` ``.
 * @param {string} twoFingersText text to be shown when two fingers are required to drag.
 *   For example: `'use two fingers to drag'`.
 * @param {{styles:Record<string,string>}} [opts] text box style overrides
 */
function ControlHintLayer(controlText, twoFingersText, opts) {
	const elem = document.createElement('div')
	elem.className = 'map-control-hint'
	applyStyles(elem, {
		position: 'absolute',
		width: '100%',
		height: '100%',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		textAlign: 'center',
		color: 'rgba(0,0,0,0.7)',
		backgroundColor: 'rgba(127,127,127,0.7)',
		transition: 'opacity 0.25s ease',
		opacity: '0',
		pointerEvents: 'none',
		fontSize: '42px',
	})
	if (opts?.styles) applyStyles(elem, opts?.styles)

	let timeout = -1
	function showHint(text) {
		clearTimeout(timeout)
		elem.textContent = text
		elem.style.opacity = '1'
		timeout = window.setTimeout(hideHint, 1000)
	}
	function hideHint() {
		clearTimeout(timeout)
		elem.style.opacity = '0'
	}

	/** @param {import('./map').LocMap} map */
	this.register = map => {
		map.getWrap().appendChild(elem)
	}
	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		map.getWrap().removeChild(elem)
	}

	/** @type {import('./map').MapEventHandlers} */
	this.onEvent = {
		mapMove: hideHint,
		mapZoom: hideHint,
		controlHint(map, e) {
			switch (e.type) {
				case 'use_control_to_zoom':
					showHint(controlText)
					break
				case 'use_two_fingers':
					showHint(twoFingersText)
					break
			}
		},
	}
}

/**
 * Returns `⌘` on MacOS/iOS and `Ctrl` on other platforms.
 * Useful for {@linkcode ControlHintLayer}.
 */
function controlHintKeyName() {
	return navigator.userAgent.includes('Macintosh') ? '⌘' : 'Ctrl'
}

;// CONCATENATED MODULE: ./node_modules/locmap/src/tile_container.js
/**
 * When `img` is `null`, the tile is considerend blank and not drawn (may be replaced by placeholder).
 *
 * When `img` is not `null`, the tile is considerend ready to be drawn.
 *
 * @template {HTMLImageElement|ImageBitmap|null} TImg
 * @typedef {{img:TImg, clear:(()=>unknown)|null, x:number, y:number, z:number, appearAt:number, lastDrawIter:number}} Tile
 */

/** @typedef {Tile<null>} BlankTile */
/** @typedef {Tile<HTMLImageElement>|Tile<ImageBitmap>} ImgTile */
/** @typedef {BlankTile|ImgTile} AnyTile */

/** @typedef {(img:HTMLImageElement|ImageBitmap|null, clear:()=>unknown) => unknown} TileUpdateFunc */
/** @typedef {(x:number, y:number, z:number, onUpdate:TileUpdateFunc) => unknown} TileImgLoadFunc */
/** @typedef {(x:number, y:number, z:number) => string} TilePathFunc */
/** @typedef {(map:import('./map').LocMap, x:number, y:number, z:number, drawX:number, drawY:number, tileW:number, scale:number) => unknown} TilePlaceholderDrawFunc */

/**
 * @param {HTMLImageElement|ImageBitmap} img
 * @returns {img is HTMLImageElement}
 */
function isHtmlImg(img) {
	return 'src' in img
}

/** @param {HTMLImageElement} img */
function clearHtmlImg(img) {
	img.src = ''
}
/** @param {ImageBitmap} img */
function clearBitmapImg(img) {
	img.close()
}

/**
 * @param {HTMLImageElement|ImageBitmap} img
 * @returns {number}
 */
function getImgWidth(img) {
	return isHtmlImg(img) ? img.naturalWidth : img.width
}

/**
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @returns {string}
 */
function getTileKey(x, y, z) {
	return `${x}|${y}|${z}`
}

/**
 * Loads, caches and draws tiles with transitions. To be used with {@linkcode TileLayer}.
 * @class
 * @param {number} tileW tile display size
 * @param {TileImgLoadFunc} tileLoadFunc loads tile image,
 *   see {@linkcode loadTileImage} and maybe {@linkcode clampEarthTiles}
 * @param {TilePlaceholderDrawFunc} [tilePlaceholderDrawFunc]
 *   draws placeholder when tile is not ready or has failed to load
 *   (for example, {@linkcode drawRectTilePlaceholder})
 */
function SmoothTileContainer(tileW, tileLoadFunc, tilePlaceholderDrawFunc) {
	const cache = /** @type {Map<string,AnyTile>} */ (new Map())

	let lastDrawnTiles = /**@type {Set<ImgTile>}*/ (new Set())
	const lastDrawnUnderLevelTilesArr = /**@type {ImgTile[]}*/ ([])

	/** @type {[iFrom:number, jFrom:number, iCount:number, jCount:number, level:number]} */
	let prevTileRegion = [0, 0, 0, 0, 0]

	let drawIter = 0

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} z
	 * @returns {AnyTile}
	 */
	function makeTile(map, x, y, z) {
		const tile = /** @type {AnyTile} */ ({
			img: null,
			clear: null,
			x,
			y,
			z,
			appearAt: 0,
			// writing here last iter (instead of 0), so if tile load will abort/fail,
			// this tile won't be the "oldest" one in the cache and won't be quickly removed
			lastDrawIter: drawIter,
		})
		tileLoadFunc(x, y, z, (img, clear) => {
			tile.img = img
			tile.clear = clear
			map.requestRedraw()
		})
		return tile
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} loadIfMissing
	 */
	function findTile(map, i, j, level, loadIfMissing) {
		const key = getTileKey(i, j, level)
		let tile = cache.get(key)
		if (!tile && loadIfMissing) {
			tile = makeTile(map, i, j, level)
			cache.set(key, tile)
		}
		return tile
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} useOpacity
	 */
	function canFullyDrawRecentTile(map, i, j, level, useOpacity) {
		const tile = findTile(map, i, j, level, false)
		return (
			!!tile &&
			!!tile.img &&
			// if tile not drawn recently, it will became transparent on next draw
			tileDrawnRecently(tile) &&
			(!useOpacity || getTileOpacity(tile) >= 1)
		)
	}

	/** @param {AnyTile} tile */
	function getTileOpacity(tile) {
		return (performance.now() - tile.appearAt) / 150
	}

	/** @param {AnyTile} tile */
	function tileDrawnRecently(tile) {
		return tile.lastDrawIter >= drawIter - 1
	}

	/** @param {AnyTile} tile */
	function tileWasOutsideOnCurLevel(tile) {
		const [iFrom, jFrom, iCount, jCount, level] = prevTileRegion
		const { x, y, z } = tile
		return z === level && (x < iFrom || x >= iFrom + iCount || y < jFrom || y >= jFrom + jCount)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {ImgTile} tile
	 * @param {boolean} withOpacity
	 * @param {number} sx
	 * @param {number} sy
	 * @param {number} sw
	 * @param {number} sh
	 * @param {number} x
	 * @param {number} y
	 * @param {number} w
	 * @param {number} h
	 */
	function drawTile(map, tile, withOpacity, sx, sy, sw, sh, x, y, w, h) {
		const rc = map.get2dContext()
		if (!rc) return

		if (!tileDrawnRecently(tile)) {
			// Preventing fade-in animation for loaded tiles which appeared on sides while moving the map.
			// This works only for tiles on current level but is simplier and is enough for most cases.
			if (tileWasOutsideOnCurLevel(tile)) tile.appearAt = 0
			// making it "appear" a bit earlier, so now tile won't be fully transparent
			else tile.appearAt = performance.now() - 16
		}
		tile.lastDrawIter = drawIter
		lastDrawnTiles.add(tile)

		const s = devicePixelRatio
		// rounding to real canvas pixels
		const rx = Math.round(x * s) / s
		const ry = Math.round(y * s) / s
		w = Math.round((x + w) * s) / s - rx
		h = Math.round((y + h) * s) / s - ry
		const alpha = withOpacity ? getTileOpacity(tile) : 1

		if (alpha < 1) rc.globalAlpha = alpha
		rc.drawImage(tile.img, sx, sy, sw, sh, rx, ry, w, h)
		// rc.fillText(tile.x + '/' + tile.y, rx, ry + 12)
		if (alpha < 1) {
			rc.globalAlpha = 1
			map.requestRedraw()
		}
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {number} tileX
	 * @param {number} tileY
	 * @param {number} tileZ
	 * @param {boolean} loadIfMissing
	 * @param {boolean} useOpacity
	 * @returns {boolean}
	 */
	function tryDrawTile(map, x, y, scale, i, j, level, tileX, tileY, tileZ, loadIfMissing, useOpacity) {
		const tile = findTile(map, tileX, tileY, tileZ, loadIfMissing)
		return !!tile && tryDrawTileObj(map, tile, x, y, scale, i, j, level, useOpacity)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {AnyTile} tile
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} useOpacity
	 * @returns {boolean}
	 */
	function tryDrawTileObj(map, tile, x, y, scale, i, j, level, useOpacity) {
		if (!tile.img) return false
		const dlevel = tile.z - level
		const dzoom = 2 ** dlevel
		const di = tile.x - i * dzoom
		const dj = tile.y - j * dzoom
		const imgW = getImgWidth(tile.img)

		let sx, sy, sw, dw
		if (dlevel >= 0) {
			if (di < 0 || dj < 0 || di >= dzoom || dj >= dzoom) return false
			dw = (tileW * scale) / dzoom
			x += di * dw
			y += dj * dw
			sx = 0
			sy = 0
			sw = imgW
		} else {
			sw = imgW * dzoom
			sx = -di * imgW
			sy = -dj * imgW
			if (sx < 0 || sy < 0 || sx >= imgW || sy >= imgW) return false
			dw = tileW * scale
		}

		drawTile(map, tile, useOpacity,
		         sx,sy, sw,sw,
		         x,y, dw,dw) //prettier-ignore
		return true
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} x
	 * @param {number} y
	 * @param {number} scale
	 * @param {number} i
	 * @param {number} j
	 * @param {number} level
	 * @param {boolean} shouldLoad
	 */
	function drawOneTile(map, x, y, scale, i, j, level, shouldLoad) {
		if (!canFullyDrawRecentTile(map, i, j, level, true)) {
			//prettier-ignore
			const canFillByQuaters =
				canFullyDrawRecentTile(map, i*2,   j*2,   level+1, false) &&
				canFullyDrawRecentTile(map, i*2,   j*2+1, level+1, false) &&
				canFullyDrawRecentTile(map, i*2+1, j*2,   level+1, false) &&
				canFullyDrawRecentTile(map, i*2+1, j*2+1, level+1, false)

			let upperTileDrawn = false
			if (!canFillByQuaters) {
				// drawing upper tiles parts
				const topLevel = Math.max(level - 5, Math.log2(map.getZoomRange()[0] / tileW) - 1)
				for (let l = level - 1; l >= topLevel; l--) {
					const sub = level - l
					upperTileDrawn = tryDrawTile(map, x,y,scale, i,j,level, i>>sub,j>>sub,level-sub, false, false) //prettier-ignore
					if (upperTileDrawn) break
				}
			}

			let lowerTilesDrawn = false
			if (!upperTileDrawn) {
				tilePlaceholderDrawFunc?.(map, i, j, level, x, y, tileW, scale)
				if (canFillByQuaters) {
					// drawing lower tiles as 2x2
					for (let di = 0; di <= 1; di++)
						for (let dj = 0; dj <= 1; dj++)
							tryDrawTile(map, x, y, scale, i, j, level, i*2+di, j*2+dj, level+1, false, false) //prettier-ignore
					lowerTilesDrawn = true
				}
			}

			// drawing additional (to 2x2) lower tiles from previous frames, useful for fast zoom-out animation.
			for (let k = 0; k < lastDrawnUnderLevelTilesArr.length; k++) {
				const tile = lastDrawnUnderLevelTilesArr[k]
				// skipping layer+1 if it was handled by upper 2x2
				if (!lowerTilesDrawn || tile.z >= level + 2)
					tryDrawTileObj(map, tile, x, y, scale, i, j, level, true)
			}
		}

		tryDrawTile(map, x, y, scale, i, j, level, i, j, level, shouldLoad, true)
	}

	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} xShift
	 * @param {number} yShift
	 * @param {number} scale
	 * @param {number} iFrom
	 * @param {number} jFrom
	 * @param {number} iCount
	 * @param {number} jCount
	 * @param {number} level
	 * @param {boolean} shouldLoad
	 */
	this.draw = (map, xShift, yShift, scale, iFrom, jFrom, iCount, jCount, level, shouldLoad) => {
		const [mapViewWidth, mapViewheight] = map.getViewBoxSize()
		// view size in tiles (extended a bit: it's needed for larger lastDrawnUnderLevelTilesArr and drawOneTile())
		const tileViewSizeExt = Math.ceil(mapViewWidth / tileW + 1) * Math.ceil(mapViewheight / tileW + 1)

		// refilling recent tiles array
		lastDrawnUnderLevelTilesArr.length = 0
		lastDrawnTiles.forEach(
			x =>
				x.z >= level + 1 &&
				lastDrawnUnderLevelTilesArr.length < tileViewSizeExt * 2 && //limiting max lower tile count, just in case
				lastDrawnUnderLevelTilesArr.push(x),
		)
		lastDrawnTiles.clear()
		drawIter++

		// start loading some center tiles first, sometimes useful on slow connections
		if (shouldLoad)
			for (let i = (iCount / 3) | 0; i < (iCount * 2) / 3; i++)
				for (let j = (jCount / 3) | 0; j < (jCount * 2) / 3; j++) {
					findTile(map, iFrom + i, jFrom + j, level, true)
				}

		// drawing tiles
		for (let i = 0; i < iCount; i++)
			for (let j = 0; j < jCount; j++) {
				const x = xShift + i * tileW * scale
				const y = yShift + j * tileW * scale
				drawOneTile(map, x, y, scale, iFrom + i, jFrom + j, level, shouldLoad)
			}

		// limiting cache size
		const cacheMaxSize = (8 * tileViewSizeExt) | 0
		for (let attempt = 0; attempt < 4 && cache.size > cacheMaxSize; attempt++) {
			let oldestIter = drawIter - 1 //must not affect recently drawn tiles
			cache.forEach(tile => (oldestIter = Math.min(oldestIter, tile.lastDrawIter)))
			cache.forEach((tile, key) => {
				if (tile.lastDrawIter === oldestIter) {
					cache.delete(key)
					lastDrawnTiles.delete(/**@type {ImgTile}*/ (tile))
					tile.clear?.()
				}
			})
		}

		prevTileRegion = [iFrom, jFrom, iCount, jCount, level]
	}

	this.getTileWidth = () => tileW

	this.clearCache = () => {
		cache.forEach(x => x.clear?.())
		cache.clear()
		lastDrawnTiles.clear()
		lastDrawnUnderLevelTilesArr.length = 0
	}
}

/**
 * Loads image for {@linkcode TileContainer}s ({@linkcode SmoothTileContainer} for example).
 * @param {TilePathFunc} pathFunc tile path func, for example:
 *   ``(x, y, z) => `http://${oneOf('a', 'b', 'c')}.tile.openstreetmap.org/${z}/${x}/${y}.png` ``
 * @returns {TileImgLoadFunc}
 */
function loadTileImage(pathFunc) {
	return (x, y, z, onUpdate) => {
		const img = new Image()
		img.src = pathFunc(x, y, z)
		const clearHtmlImg_ = () => clearHtmlImg(img)
		img.onload = () => {
			const createImageBitmap = window.createImageBitmap
			if (createImageBitmap) {
				// trying no decode image in parallel thread,
				// if failed (beacuse of CORS for example) tryimg to show image anyway
				createImageBitmap(img).then(
					x => onUpdate(x, () => clearBitmapImg(x)),
					() => onUpdate(img, clearHtmlImg_),
				)
			} else {
				onUpdate(img, clearHtmlImg_)
			}
		}
		onUpdate(null, clearHtmlImg_)
	}
}

/**
 * Wrapper for {@linkcode TilePathFunc} (like {@linkcode loadTileImage}).
 * Skips loading tiles outside of the map square (1x1 on level 0, 2x2 on level 1, etc.).
 *
 * @param {TileImgLoadFunc} tileFunc
 * @returns {TileImgLoadFunc}
 */
function clampEarthTiles(tileFunc) {
	return (x, y, z, onUpdate) => {
		const w = 2 ** z
		if (z < 0 || x < 0 || x >= w || y < 0 || y >= w) return
		tileFunc(x, y, z, onUpdate)
	}
}

/**
 * Draws simple tile placeholder (semi-transparent square).
 *
 * @param {import('./map').LocMap} map
 * @param {number} x tile column index
 * @param {number} y tile row index
 * @param {number} z tile level
 * @param {number} drawX location on canvas
 * @param {number} drawY location on canvas
 * @param {number} tileW current tile size
 * @param {number} scale tile scale relative to it's regular size (displaying size is `tileW*scale`)
 */
function drawRectTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale) {
	const rc = map.get2dContext()
	if (rc === null) return
	const w = tileW * scale
	const margin = 1.5
	rc.strokeStyle = '#8883'
	rc.strokeRect(drawX + margin, drawY + margin, w - margin * 2, w - margin * 2)
}

;// CONCATENATED MODULE: ./node_modules/locmap/src/tile_layer.js
/**
 * @typedef {object} TileContainer
 * @prop {() => unknown} clearCache
 * @prop {() => number} getTileWidth
 * @prop {(map:import('./map').LocMap,
 *   xShift:number, yShift:number, scale:number,
 *   iFrom:number, jFrom:number, iCount:number, jCount:number, level:number,
 *   shouldLoad: boolean) => unknown} draw
 */

/**
 * Loads and draw tiles using {@linkcode TileContainer}.
 * Disables tile load while zooming.
 * @class
 * @param {TileContainer} tileContainer tile cache/drawer, for example {@linkcode SmoothTileContainer}
 */
function TileLayer(tileContainer) {
	let shouldLoadTiles = true
	let lastZoomAt = 0
	let curZoomTotalDelta = 1
	let tileLoadOffTimeout = -1
	let tileLoadPausedAt = 0
	/**
	 * @param {import('./map').LocMap} map
	 * @param {number} durationMS
	 */
	function pauseTileLoad(map, durationMS) {
		if (shouldLoadTiles) {
			tileLoadPausedAt = performance.now()
			shouldLoadTiles = false
		}
		clearTimeout(tileLoadOffTimeout)
		tileLoadOffTimeout = window.setTimeout(() => {
			shouldLoadTiles = true
			map.requestRedraw()
		}, durationMS)
	}

	/** @param {import('./map').LocMap} map */
	this.unregister = map => {
		tileContainer.clearCache()
	}

	/** @param {import('./map').LocMap} map */
	this.redraw = map => {
		const tileW = tileContainer.getTileWidth()
		//extra level shift (not 0.5), or on half-level zoom text on tiles may be too small
		const level = Math.floor(Math.log2(map.getZoom() / tileW) + 0.4)
		const tileGridSize = 2 ** level
		const scale = map.getZoom() / tileW / tileGridSize
		const blockSize = tileW * scale
		const [mapXShift, mapYShift] = map.getViewBoxShift()
		const [mapViewWidth, mapViewHeight] = map.getViewBoxSize()

		const iFrom = Math.floor(mapXShift / blockSize)
		const xShift = -mapXShift + iFrom * blockSize

		const jFrom = Math.floor(mapYShift / blockSize)
		const yShift = -mapYShift + jFrom * blockSize

		const iCount = (((mapViewWidth - xShift) / blockSize) | 0) + 1
		const jCount = (((mapViewHeight - yShift) / blockSize) | 0) + 1

		tileContainer.draw(map, xShift, yShift, scale, iFrom, jFrom, iCount, jCount, level, shouldLoadTiles)
	}

	/** @type {import('./map').MapEventHandlers} */
	this.onEvent = {
		mapZoom(map, { delta }) {
			const now = performance.now()
			const timeDelta = now - lastZoomAt
			if (timeDelta > 250) curZoomTotalDelta = 1 //new zoom action started
			lastZoomAt = now
			curZoomTotalDelta *= delta

			// if zoomed enough
			if (curZoomTotalDelta < 1 / 1.2 || curZoomTotalDelta > 1.2) {
				// if fast enough
				const isFast = timeDelta === 0 || Math.abs(delta ** (1 / timeDelta) - 1) > 0.0005
				if (isFast) {
					// unpausing periodically in case of long slow zooming
					if (shouldLoadTiles || now - tileLoadPausedAt > 1000) pauseTileLoad(map, 80)
				}
			}
		},
	}
}

;// CONCATENATED MODULE: ./node_modules/locmap/src/index.js









// EXTERNAL MODULE: ./node_modules/preact/hooks/dist/hooks.mjs
var hooks = __webpack_require__(954);
// EXTERNAL MODULE: ./lib/utils/values.js
var values = __webpack_require__(222);
// EXTERNAL MODULE: ./www/src/utils/preact-compat.tsx + 3 modules
var preact_compat = __webpack_require__(49);
;// CONCATENATED MODULE: ./www/src/components/teyvat-map.tsx







const TILE_DRAW_WIDTH = 192;
const TILE_CONTENT_WIDTH = 256; //tile width in game pixels on layer 0
const MIN_LEVEL = -5.5;
const MAX_LEVEL = 1;
const DEFAULT_LEVEL = -1.2;
const MARKERS_AUTO_REGION_DOWNSCALE = 1.1;
const MARKER_ICON_SIZE_PX = 40;
let tileExt = 'jpg';
if (false)
    {}
const TILES_ROOT = `https://genshin-base.github.io/teyvat-map/v2.4/tiles`;
function tilePathFinc(x, y, z, mapCode) {
    return `${TILES_ROOT}/${mapCode}/${tileExt}/${z}/${x}/${y}.${tileExt}`;
}
const tilesMask = {};
if (false)
    {}
const MapProjection = {
    x2lon(x, zoom) {
        return (x / zoom) * TILE_CONTENT_WIDTH;
    },
    y2lat(y, zoom) {
        return (y / zoom) * TILE_CONTENT_WIDTH;
    },
    lon2x(lon, zoom) {
        return (lon * zoom) / TILE_CONTENT_WIDTH;
    },
    lat2y(lat, zoom) {
        return (lat * zoom) / TILE_CONTENT_WIDTH;
    },
    meters2pixCoef(lat, zoom) {
        return zoom / TILE_CONTENT_WIDTH;
    },
};
const TeyvatMap = (0,preact_compat/* memo */.X)(function TeyvatMap({ classes, mapCode, pos, markers, }) {
    const wrapRef = (0,hooks/* useRef */.sO)(null);
    const mapRef = (0,hooks/* useRef */.sO)(null);
    const mapCodeRef = (0,hooks/* useRef */.sO)('teyvat');
    (0,hooks/* useEffect */.d4)(() => {
        if (!wrapRef.current)
            return;
        function shouldDrawTile(x, y, z) {
            const mask = tilesMask[mapCodeRef.current];
            return !mask || mask(x, y, z);
        }
        const drawTilePlaceholder = (map, x, y, z, drawX, drawY, tileW, scale) => {
            if (shouldDrawTile(x, y, z))
                drawRectTilePlaceholder(map, x, y, z, drawX, drawY, tileW, scale);
        };
        const loadTileInner = loadTileImage((x, y, z) => tilePathFinc(x, y, z, mapCodeRef.current));
        const loadTile = (x, y, z, onUpdate) => {
            if (shouldDrawTile(x, y, z))
                loadTileInner(x, y, z, onUpdate);
        };
        const tileContainer = new SmoothTileContainer(TILE_DRAW_WIDTH, loadTile, drawTilePlaceholder);
        const map = new LocMap(wrapRef.current, MapProjection);
        const markersLayer = new MarkersLayer();
        map.setZoomRange(2 ** MIN_LEVEL * TILE_CONTENT_WIDTH, 2 ** MAX_LEVEL * TILE_CONTENT_WIDTH);
        map.register(new TileLayer(tileContainer));
        map.register(markersLayer);
        map.register(new ControlLayer());
        map.requestRedraw();
        map.resize();
        addEventListener('resize', map.resize);
        mapRef.current = { map, markersLayer, tileContainer };
        return () => {
            map.getLayers().forEach(map.unregister);
            removeEventListener('resize', map.resize);
            mapRef.current = null;
        };
    }, []);
    (0,hooks/* useEffect */.d4)(() => {
        const m = mapRef.current;
        mapCodeRef.current = mapCode;
        m?.markersLayer.setMapCode(mapCode);
        m?.tileContainer.clearCache();
        m?.map.requestRedraw();
    }, [mapCode]);
    (0,hooks/* useEffect */.d4)(() => {
        mapRef.current?.markersLayer.setMarkers(markers ?? []);
    }, [markers]);
    (0,hooks/* useEffect */.d4)(() => {
        const map = mapRef.current?.map;
        if (!map)
            return;
        const { x, y, level } = pos === 'auto' ? calcAutoPosition(map, markers ?? [], mapCode) : pos;
        map.updateLocation(x, y, TILE_CONTENT_WIDTH * 2 ** level);
    }, [pos, markers, mapCode]);
    return (0,jsxRuntime/* jsx */.tZ)("div", { ref: wrapRef, class: 'teyvat-map ' + classes }, void 0);
});
function calcAutoPosition(map, markers, mapCode) {
    let xMin = 1e10;
    let xMax = -1e10;
    let yMin = 1e10;
    let yMax = -1e10;
    for (const marker of markers) {
        if (marker.mapCode !== mapCode)
            continue;
        if (xMin > marker.x)
            xMin = marker.x;
        if (xMax < marker.x)
            xMax = marker.x;
        if (yMin > marker.y)
            yMin = marker.y;
        if (yMax < marker.y)
            yMax = marker.y;
    }
    const [w, h] = map.getViewBoxSize();
    const zoom = Math.min(w / (xMax - xMin), h / (yMax - yMin)) / MARKERS_AUTO_REGION_DOWNSCALE;
    // zoom==inf -> one marker, zoom<0 -> no markers
    let level = zoom === Infinity || zoom < 0 ? DEFAULT_LEVEL : Math.log2(zoom);
    level = (0,values/* clamp */.uZ)(MIN_LEVEL, level, MAX_LEVEL);
    return { x: (xMin + xMax) / 2, y: (yMin + yMax) / 2, level };
}
class MarkersLayer {
    map = null;
    markers = [];
    iconCache = new Map();
    mapCode = 'teyvat';
    loadMarkerImg(src, style) {
        const key = src + '|' + style;
        const cachedIcon = this.iconCache.get(key);
        if (cachedIcon) {
            if (cachedIcon.img)
                this.map?.requestRedraw();
            return cachedIcon;
        }
        else {
            const img = new Image();
            const icon = { img: null };
            img.src = src;
            img.onload = () => {
                icon.img =
                    style === 'outline'
                        ? makeCanvasWithShadow(img, 1, 'black') //
                        : img;
                this.map?.requestRedraw();
            };
            this.iconCache.set(key, icon);
            return icon;
        }
    }
    setMapCode(mapCode) {
        this.mapCode = mapCode;
    }
    setMarkers(rawMarkers) {
        this.markers.length = 0;
        {
            const cache = this.iconCache;
            for (const key of cache.keys()) {
                if (cache.size < 30)
                    break;
                cache.delete(key);
            }
        }
        for (const raw of rawMarkers) {
            const marker = { ...raw, icon: this.loadMarkerImg(raw.icon, raw.style), style: raw.style };
            this.markers.push(marker);
        }
    }
    redraw(map) {
        const rc = map.get2dContext();
        if (!rc)
            return;
        const [viewX, viewY] = map.getViewBoxShift();
        const zoomDownscale = Math.min(1, (map.getZoom() / TILE_DRAW_WIDTH - 1) / 2 + 1);
        for (let i = 0, markers = this.markers; i < markers.length; i++) {
            const marker = markers[i];
            if (marker.mapCode !== this.mapCode)
                continue;
            const x = map.lon2x(marker.x) - viewX;
            const y = map.lat2y(marker.y) - viewY;
            const size = MARKER_ICON_SIZE_PX * zoomDownscale;
            const lineW = 1.5 * zoomDownscale;
            const isCircled = marker.style === 'circle';
            if (isCircled) {
                rc.beginPath();
                rc.arc(x, y, size / 2 + lineW / 2 + 0.75, 0, Math.PI * 2, false);
                rc.fillStyle = '#333';
                rc.fill();
            }
            const img = marker.icon.img;
            if (img !== null) {
                const isImg = 'naturalWidth' in img;
                const nw = isImg ? img.naturalWidth : img.width;
                const nh = isImg ? img.naturalHeight : img.height;
                const scale = Math.min(size / nw, size / nh);
                const w = nw * scale;
                const h = nh * scale;
                if (isCircled) {
                    rc.save();
                    rc.beginPath();
                    rc.arc(x, y, size / 2 - lineW / 2 - 0.75, 0, Math.PI * 2, false);
                    rc.clip();
                }
                rc.drawImage(img, x - w / 2, y - h / 2, w, h);
                if (isCircled) {
                    rc.restore();
                }
            }
            if (isCircled) {
                rc.beginPath();
                rc.arc(x, y, size / 2, 0, Math.PI * 2, false);
                rc.strokeStyle = 'white';
                rc.lineWidth = lineW;
                rc.stroke();
            }
        }
    }
    register(map) {
        this.map = map;
    }
    unregister(map) {
        this.map = null;
        this.markers.length = 0;
    }
}
function makeCanvasWithShadow(img, blur, color) {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const rc = canvas.getContext('2d');
    if (rc) {
        rc.shadowBlur = blur;
        rc.shadowColor = color;
        for (let i = 0; i < 3; i++)
            rc.drawImage(img, 0, 0);
    }
    return canvas;
}


/***/ }),

/***/ 49:
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {


// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "j": () => (/* binding */ preact_compat_createPortal),
  "X": () => (/* binding */ preact_compat_memo)
});

// EXTERNAL MODULE: ./node_modules/preact/dist/preact.mjs
var preact = __webpack_require__(934);
;// CONCATENATED MODULE: ./node_modules/preact/compat/src/util.js
/**
 * Assign properties from `props` to `obj`
 * @template O, P The obj and props types
 * @param {O} obj The object to copy properties to
 * @param {P} props The object to copy properties from
 * @returns {O & P}
 */
function util_assign(obj, props) {
	for (let i in props) obj[i] = props[i];
	return /** @type {O & P} */ (obj);
}

/**
 * Check if two objects have a different shape
 * @param {object} a
 * @param {object} b
 * @returns {boolean}
 */
function shallowDiffers(a, b) {
	for (let i in a) if (i !== '__source' && !(i in b)) return true;
	for (let i in b) if (i !== '__source' && a[i] !== b[i]) return true;
	return false;
}

function removeNode(node) {
	let parentNode = node.parentNode;
	if (parentNode) parentNode.removeChild(node);
}

;// CONCATENATED MODULE: ./node_modules/preact/compat/src/memo.js



/**
 * Memoize a component, so that it only updates when the props actually have
 * changed. This was previously known as `React.pure`.
 * @param {import('./internal').FunctionComponent} c functional component
 * @param {(prev: object, next: object) => boolean} [comparer] Custom equality function
 * @returns {import('./internal').FunctionComponent}
 */
function memo(c, comparer) {
	function shouldUpdate(nextProps) {
		let ref = this.props.ref;
		let updateRef = ref == nextProps.ref;
		if (!updateRef && ref) {
			ref.call ? ref(null) : (ref.current = null);
		}

		if (!comparer) {
			return shallowDiffers(this.props, nextProps);
		}

		return !comparer(this.props, nextProps) || !updateRef;
	}

	function Memoed(props) {
		this.shouldComponentUpdate = shouldUpdate;
		return (0,preact/* createElement */.az)(c, props);
	}
	Memoed.displayName = 'Memo(' + (c.displayName || c.name) + ')';
	Memoed.prototype.isReactComponent = true;
	Memoed._forwarded = true;
	return Memoed;
}

;// CONCATENATED MODULE: ./node_modules/preact/compat/src/portals.js


/**
 * @param {import('../../src/index').RenderableProps<{ context: any }>} props
 */
function ContextProvider(props) {
	this.getChildContext = () => props.context;
	return props.children;
}

/**
 * Portal component
 * @this {import('./internal').Component}
 * @param {object | null | undefined} props
 *
 * TODO: use createRoot() instead of fake root
 */
function Portal(props) {
	const _this = this;
	let container = props._container;

	_this.componentWillUnmount = function() {
		(0,preact/* render */.sY)(null, _this._temp);
		_this._temp = null;
		_this._container = null;
	};

	// When we change container we should clear our old container and
	// indicate a new mount.
	if (_this._container && _this._container !== container) {
		_this.componentWillUnmount();
	}

	// When props.vnode is undefined/false/null we are dealing with some kind of
	// conditional vnode. This should not trigger a render.
	if (props._vnode) {
		if (!_this._temp) {
			_this._container = container;

			// Create a fake DOM parent node that manages a subset of `container`'s children:
			_this._temp = {
				nodeType: 1,
				parentNode: container,
				childNodes: [],
				appendChild(child) {
					this.childNodes.push(child);
					_this._container.appendChild(child);
				},
				insertBefore(child, before) {
					this.childNodes.push(child);
					_this._container.appendChild(child);
				},
				removeChild(child) {
					this.childNodes.splice(this.childNodes.indexOf(child) >>> 1, 1);
					_this._container.removeChild(child);
				}
			};
		}

		// Render our wrapping element into temp.
		(0,preact/* render */.sY)(
			(0,preact/* createElement */.az)(ContextProvider, { context: _this.context }, props._vnode),
			_this._temp
		);
	}
	// When we come from a conditional render, on a mounted
	// portal we should clear the DOM.
	else if (_this._temp) {
		_this.componentWillUnmount();
	}
}

/**
 * Create a `Portal` to continue rendering the vnode tree at a different DOM node
 * @param {import('./internal').VNode} vnode The vnode to render
 * @param {import('./internal').PreactElement} container The DOM node to continue rendering in to.
 */
function createPortal(vnode, container) {
	return (0,preact/* createElement */.az)(Portal, { _vnode: vnode, _container: container });
}

;// CONCATENATED MODULE: ./www/src/utils/preact-compat.tsx
// direct imports to avoid kilobytes of side-effects from 'preact/compat'
// normal imports (preact/compat/src/memo) do not work with webpack (it strictly follows 'exports' field in package.json)


const preact_compat_createPortal = createPortal;
const preact_compat_memo = memo;


/***/ }),

/***/ 222:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "A$": () => (/* binding */ mustBeDefined),
/* harmony export */   "EX": () => (/* binding */ mustBeNever),
/* harmony export */   "iD": () => (/* binding */ warnUnlessNever),
/* harmony export */   "uZ": () => (/* binding */ clamp),
/* harmony export */   "WN": () => (/* binding */ promiseNever),
/* harmony export */   "tI": () => (/* binding */ isPromise)
/* harmony export */ });
/* unused harmony exports mustBeNotNull, isDefined, simpleDeepEqual, groupByToMap, Deferred */
/**
 * @template T
 * @param {T|null} val
 * @returns {T}
 */
function mustBeNotNull(val) {
	if (val === null) throw new Error('value is null, this should not happen')
	return val
}

/**
 * @template T
 * @param {T|undefined} val
 * @returns {T}
 */
function mustBeDefined(val) {
	if (val === undefined) throw new Error('value is undefined, this should not happen')
	return val
}

/**
 * @template T
 * @param {T|undefined} x
 * @returns {x is T}
 */
function isDefined(x) {
	return x !== undefined
}

/**
 * @param {never[]} values
 * @returns {never}
 */
function mustBeNever(...values) {
	throw new Error('must not be reachable')
}

/**
 * @param {string} msg
 * @param {never[]} values
 * @returns {void}
 */
function warnUnlessNever(msg, ...values) {
	console.warn(msg, ...values)
}

/**
 * @param {unknown} a
 * @param {unknown} b
 * @returns {boolean}
 */
function simpleDeepEqual(a, b) {
	if (Array.isArray(a) && Array.isArray(b)) {
		if (a.length !== b.length) return false
		for (let i = 0; i < a.length; i++) {
			if (!simpleDeepEqual(a[i], b[i])) return false
		}
		return true
	}
	if (typeof a === 'object' && typeof b === 'object' && a !== null && b !== null) {
		if (Object.keys(a).length !== Object.keys(b).length) return false
		for (const attr in a) {
			if (!simpleDeepEqual(a[attr], b[attr])) return false
		}
		return true
	}
	return a === b
}

/**
 * @template TVal
 * @template TKey
 * @param {Iterable<TVal>} items
 * @param {(item:TVal) => TKey} keyFunc
 * @returns {Map<TKey, TVal[]>}
 */
function groupByToMap(items, keyFunc) {
	const map = /**@type {Map<TKey, TVal[]>}*/ (new Map())
	for (const item of items) {
		const key = keyFunc(item)
		const cur = map.get(key)
		if (cur) cur.push(item)
		else map.set(key, [item])
	}
	return map
}

/**
 * @param {number} min
 * @param {number} val
 * @param {number} max
 * @returns {number}
 */
function clamp(min, val, max) {
	return val < min ? min : val > max ? max : val
}

/** @returns {Promise<never>} */
function promiseNever() {
	return new Promise(() => undefined)
}

/**
 * @class
 * @template T
 */
function Deferred() {
	/** @type {Promise<T>} */
	this.promise = new Promise((res, rej) => {
		this.resolve = res
		this.reject = rej
	})
}

/**
 * @template T
 * @param {T | Promise<T>} value
 * @returns {value is Promise<T>}
 */
function isPromise(value) {
	return typeof value === 'object' && value !== null && 'then' in value
}


/***/ }),

/***/ 934:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "sY": () => (/* binding */ S),
/* harmony export */   "az": () => (/* binding */ v),
/* harmony export */   "h": () => (/* binding */ v),
/* harmony export */   "HY": () => (/* binding */ d),
/* harmony export */   "kr": () => (/* binding */ D),
/* harmony export */   "YM": () => (/* binding */ l)
/* harmony export */ });
/* unused harmony exports hydrate, createRef, isValidElement, Component, cloneElement, toChildArray */
var n,l,u,i,t,o,r,f,e={},c=[],s=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|itera/i;function a(n,l){for(var u in l)n[u]=l[u];return n}function h(n){var l=n.parentNode;l&&l.removeChild(n)}function v(l,u,i){var t,o,r,f={};for(r in u)"key"==r?t=u[r]:"ref"==r?o=u[r]:f[r]=u[r];if(arguments.length>2&&(f.children=arguments.length>3?n.call(arguments,2):i),"function"==typeof l&&null!=l.defaultProps)for(r in l.defaultProps)void 0===f[r]&&(f[r]=l.defaultProps[r]);return y(l,f,t,o,null)}function y(n,i,t,o,r){var f={type:n,props:i,key:t,ref:o,__k:null,__:null,__b:0,__e:null,__d:void 0,__c:null,__h:null,constructor:void 0,__v:null==r?++u:r};return null==r&&null!=l.vnode&&l.vnode(f),f}function p(){return{current:null}}function d(n){return n.children}function _(n,l){this.props=n,this.context=l}function k(n,l){if(null==l)return n.__?k(n.__,n.__.__k.indexOf(n)+1):null;for(var u;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e)return u.__e;return"function"==typeof n.type?k(n):null}function b(n){var l,u;if(null!=(n=n.__)&&null!=n.__c){for(n.__e=n.__c.base=null,l=0;l<n.__k.length;l++)if(null!=(u=n.__k[l])&&null!=u.__e){n.__e=n.__c.base=u.__e;break}return b(n)}}function m(n){(!n.__d&&(n.__d=!0)&&t.push(n)&&!g.__r++||r!==l.debounceRendering)&&((r=l.debounceRendering)||o)(g)}function g(){for(var n;g.__r=t.length;)n=t.sort(function(n,l){return n.__v.__b-l.__v.__b}),t=[],n.some(function(n){var l,u,i,t,o,r;n.__d&&(o=(t=(l=n).__v).__e,(r=l.__P)&&(u=[],(i=a({},t)).__v=t.__v+1,j(r,t,i,l.__n,void 0!==r.ownerSVGElement,null!=t.__h?[o]:null,u,null==o?k(t):o,t.__h),z(u,t),t.__e!=o&&b(t)))})}function w(n,l,u,i,t,o,r,f,s,a){var h,v,p,_,b,m,g,w=i&&i.__k||c,A=w.length;for(u.__k=[],h=0;h<l.length;h++)if(null!=(_=u.__k[h]=null==(_=l[h])||"boolean"==typeof _?null:"string"==typeof _||"number"==typeof _||"bigint"==typeof _?y(null,_,null,null,_):Array.isArray(_)?y(d,{children:_},null,null,null):_.__b>0?y(_.type,_.props,_.key,null,_.__v):_)){if(_.__=u,_.__b=u.__b+1,null===(p=w[h])||p&&_.key==p.key&&_.type===p.type)w[h]=void 0;else for(v=0;v<A;v++){if((p=w[v])&&_.key==p.key&&_.type===p.type){w[v]=void 0;break}p=null}j(n,_,p=p||e,t,o,r,f,s,a),b=_.__e,(v=_.ref)&&p.ref!=v&&(g||(g=[]),p.ref&&g.push(p.ref,null,_),g.push(v,_.__c||b,_)),null!=b?(null==m&&(m=b),"function"==typeof _.type&&_.__k===p.__k?_.__d=s=x(_,s,n):s=P(n,_,p,w,b,s),"function"==typeof u.type&&(u.__d=s)):s&&p.__e==s&&s.parentNode!=n&&(s=k(p))}for(u.__e=m,h=A;h--;)null!=w[h]&&("function"==typeof u.type&&null!=w[h].__e&&w[h].__e==u.__d&&(u.__d=k(i,h+1)),N(w[h],w[h]));if(g)for(h=0;h<g.length;h++)M(g[h],g[++h],g[++h])}function x(n,l,u){for(var i,t=n.__k,o=0;t&&o<t.length;o++)(i=t[o])&&(i.__=n,l="function"==typeof i.type?x(i,l,u):P(u,i,i,t,i.__e,l));return l}function A(n,l){return l=l||[],null==n||"boolean"==typeof n||(Array.isArray(n)?n.some(function(n){A(n,l)}):l.push(n)),l}function P(n,l,u,i,t,o){var r,f,e;if(void 0!==l.__d)r=l.__d,l.__d=void 0;else if(null==u||t!=o||null==t.parentNode)n:if(null==o||o.parentNode!==n)n.appendChild(t),r=null;else{for(f=o,e=0;(f=f.nextSibling)&&e<i.length;e+=2)if(f==t)break n;n.insertBefore(t,o),r=o}return void 0!==r?r:t.nextSibling}function C(n,l,u,i,t){var o;for(o in u)"children"===o||"key"===o||o in l||H(n,o,null,u[o],i);for(o in l)t&&"function"!=typeof l[o]||"children"===o||"key"===o||"value"===o||"checked"===o||u[o]===l[o]||H(n,o,l[o],u[o],i)}function $(n,l,u){"-"===l[0]?n.setProperty(l,u):n[l]=null==u?"":"number"!=typeof u||s.test(l)?u:u+"px"}function H(n,l,u,i,t){var o;n:if("style"===l)if("string"==typeof u)n.style.cssText=u;else{if("string"==typeof i&&(n.style.cssText=i=""),i)for(l in i)u&&l in u||$(n.style,l,"");if(u)for(l in u)i&&u[l]===i[l]||$(n.style,l,u[l])}else if("o"===l[0]&&"n"===l[1])o=l!==(l=l.replace(/Capture$/,"")),l=l.toLowerCase()in n?l.toLowerCase().slice(2):l.slice(2),n.l||(n.l={}),n.l[l+o]=u,u?i||n.addEventListener(l,o?T:I,o):n.removeEventListener(l,o?T:I,o);else if("dangerouslySetInnerHTML"!==l){if(t)l=l.replace(/xlink[H:h]/,"h").replace(/sName$/,"s");else if("href"!==l&&"list"!==l&&"form"!==l&&"tabIndex"!==l&&"download"!==l&&l in n)try{n[l]=null==u?"":u;break n}catch(n){}"function"==typeof u||(null!=u&&(!1!==u||"a"===l[0]&&"r"===l[1])?n.setAttribute(l,u):n.removeAttribute(l))}}function I(n){this.l[n.type+!1](l.event?l.event(n):n)}function T(n){this.l[n.type+!0](l.event?l.event(n):n)}function j(n,u,i,t,o,r,f,e,c){var s,h,v,y,p,k,b,m,g,x,A,P=u.type;if(void 0!==u.constructor)return null;null!=i.__h&&(c=i.__h,e=u.__e=i.__e,u.__h=null,r=[e]),(s=l.__b)&&s(u);try{n:if("function"==typeof P){if(m=u.props,g=(s=P.contextType)&&t[s.__c],x=s?g?g.props.value:s.__:t,i.__c?b=(h=u.__c=i.__c).__=h.__E:("prototype"in P&&P.prototype.render?u.__c=h=new P(m,x):(u.__c=h=new _(m,x),h.constructor=P,h.render=O),g&&g.sub(h),h.props=m,h.state||(h.state={}),h.context=x,h.__n=t,v=h.__d=!0,h.__h=[]),null==h.__s&&(h.__s=h.state),null!=P.getDerivedStateFromProps&&(h.__s==h.state&&(h.__s=a({},h.__s)),a(h.__s,P.getDerivedStateFromProps(m,h.__s))),y=h.props,p=h.state,v)null==P.getDerivedStateFromProps&&null!=h.componentWillMount&&h.componentWillMount(),null!=h.componentDidMount&&h.__h.push(h.componentDidMount);else{if(null==P.getDerivedStateFromProps&&m!==y&&null!=h.componentWillReceiveProps&&h.componentWillReceiveProps(m,x),!h.__e&&null!=h.shouldComponentUpdate&&!1===h.shouldComponentUpdate(m,h.__s,x)||u.__v===i.__v){h.props=m,h.state=h.__s,u.__v!==i.__v&&(h.__d=!1),h.__v=u,u.__e=i.__e,u.__k=i.__k,u.__k.forEach(function(n){n&&(n.__=u)}),h.__h.length&&f.push(h);break n}null!=h.componentWillUpdate&&h.componentWillUpdate(m,h.__s,x),null!=h.componentDidUpdate&&h.__h.push(function(){h.componentDidUpdate(y,p,k)})}h.context=x,h.props=m,h.state=h.__s,(s=l.__r)&&s(u),h.__d=!1,h.__v=u,h.__P=n,s=h.render(h.props,h.state,h.context),h.state=h.__s,null!=h.getChildContext&&(t=a(a({},t),h.getChildContext())),v||null==h.getSnapshotBeforeUpdate||(k=h.getSnapshotBeforeUpdate(y,p)),A=null!=s&&s.type===d&&null==s.key?s.props.children:s,w(n,Array.isArray(A)?A:[A],u,i,t,o,r,f,e,c),h.base=u.__e,u.__h=null,h.__h.length&&f.push(h),b&&(h.__E=h.__=null),h.__e=!1}else null==r&&u.__v===i.__v?(u.__k=i.__k,u.__e=i.__e):u.__e=L(i.__e,u,i,t,o,r,f,c);(s=l.diffed)&&s(u)}catch(n){u.__v=null,(c||null!=r)&&(u.__e=e,u.__h=!!c,r[r.indexOf(e)]=null),l.__e(n,u,i)}}function z(n,u){l.__c&&l.__c(u,n),n.some(function(u){try{n=u.__h,u.__h=[],n.some(function(n){n.call(u)})}catch(n){l.__e(n,u.__v)}})}function L(l,u,i,t,o,r,f,c){var s,a,v,y=i.props,p=u.props,d=u.type,_=0;if("svg"===d&&(o=!0),null!=r)for(;_<r.length;_++)if((s=r[_])&&"setAttribute"in s==!!d&&(d?s.localName===d:3===s.nodeType)){l=s,r[_]=null;break}if(null==l){if(null===d)return document.createTextNode(p);l=o?document.createElementNS("http://www.w3.org/2000/svg",d):document.createElement(d,p.is&&p),r=null,c=!1}if(null===d)y===p||c&&l.data===p||(l.data=p);else{if(r=r&&n.call(l.childNodes),a=(y=i.props||e).dangerouslySetInnerHTML,v=p.dangerouslySetInnerHTML,!c){if(null!=r)for(y={},_=0;_<l.attributes.length;_++)y[l.attributes[_].name]=l.attributes[_].value;(v||a)&&(v&&(a&&v.__html==a.__html||v.__html===l.innerHTML)||(l.innerHTML=v&&v.__html||""))}if(C(l,p,y,o,c),v)u.__k=[];else if(_=u.props.children,w(l,Array.isArray(_)?_:[_],u,i,t,o&&"foreignObject"!==d,r,f,r?r[0]:i.__k&&k(i,0),c),null!=r)for(_=r.length;_--;)null!=r[_]&&h(r[_]);c||("value"in p&&void 0!==(_=p.value)&&(_!==l.value||"progress"===d&&!_||"option"===d&&_!==y.value)&&H(l,"value",_,y.value,!1),"checked"in p&&void 0!==(_=p.checked)&&_!==l.checked&&H(l,"checked",_,y.checked,!1))}return l}function M(n,u,i){try{"function"==typeof n?n(u):n.current=u}catch(n){l.__e(n,i)}}function N(n,u,i){var t,o;if(l.unmount&&l.unmount(n),(t=n.ref)&&(t.current&&t.current!==n.__e||M(t,null,u)),null!=(t=n.__c)){if(t.componentWillUnmount)try{t.componentWillUnmount()}catch(n){l.__e(n,u)}t.base=t.__P=null}if(t=n.__k)for(o=0;o<t.length;o++)t[o]&&N(t[o],u,"function"!=typeof n.type);i||null==n.__e||h(n.__e),n.__e=n.__d=void 0}function O(n,l,u){return this.constructor(n,u)}function S(u,i,t){var o,r,f;l.__&&l.__(u,i),r=(o="function"==typeof t)?null:t&&t.__k||i.__k,f=[],j(i,u=(!o&&t||i).__k=v(d,null,[u]),r||e,e,void 0!==i.ownerSVGElement,!o&&t?[t]:r?null:i.firstChild?n.call(i.childNodes):null,f,!o&&t?t:r?r.__e:i.firstChild,o),z(f,u)}function q(n,l){S(n,l,q)}function B(l,u,i){var t,o,r,f=a({},l.props);for(r in u)"key"==r?t=u[r]:"ref"==r?o=u[r]:f[r]=u[r];return arguments.length>2&&(f.children=arguments.length>3?n.call(arguments,2):i),y(l.type,f,t||l.key,o||l.ref,null)}function D(n,l){var u={__c:l="__cC"+f++,__:n,Consumer:function(n,l){return n.children(l)},Provider:function(n){var u,i;return this.getChildContext||(u=[],(i={})[l]=this,this.getChildContext=function(){return i},this.shouldComponentUpdate=function(n){this.props.value!==n.value&&u.some(m)},this.sub=function(n){u.push(n);var l=n.componentWillUnmount;n.componentWillUnmount=function(){u.splice(u.indexOf(n),1),l&&l.call(n)}}),n.children}};return u.Provider.__=u.Consumer.contextType=u}n=c.slice,l={__e:function(n,l){for(var u,i,t;l=l.__;)if((u=l.__c)&&!u.__)try{if((i=u.constructor)&&null!=i.getDerivedStateFromError&&(u.setState(i.getDerivedStateFromError(n)),t=u.__d),null!=u.componentDidCatch&&(u.componentDidCatch(n),t=u.__d),t)return u.__E=u}catch(l){n=l}throw n}},u=0,i=function(n){return null!=n&&void 0===n.constructor},_.prototype.setState=function(n,l){var u;u=null!=this.__s&&this.__s!==this.state?this.__s:this.__s=a({},this.state),"function"==typeof n&&(n=n(a({},u),this.props)),n&&a(u,n),null!=n&&this.__v&&(l&&this.__h.push(l),m(this))},_.prototype.forceUpdate=function(n){this.__v&&(this.__e=!0,n&&this.__h.push(n),m(this))},_.prototype.render=d,t=[],o="function"==typeof Promise?Promise.prototype.then.bind(Promise.resolve()):setTimeout,g.__r=0,f=0;
//# sourceMappingURL=preact.module.js.map


/***/ }),

/***/ 954:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "eJ": () => (/* binding */ l),
/* harmony export */   "d4": () => (/* binding */ y),
/* harmony export */   "bt": () => (/* binding */ h),
/* harmony export */   "sO": () => (/* binding */ s),
/* harmony export */   "Ye": () => (/* binding */ d),
/* harmony export */   "I4": () => (/* binding */ A),
/* harmony export */   "qp": () => (/* binding */ F)
/* harmony export */ });
/* unused harmony exports useReducer, useImperativeHandle, useDebugValue, useErrorBoundary */
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(934);
var t,u,r,o=0,i=[],c=preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__b */ .YM.__b,f=preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__r */ .YM.__r,e=preact__WEBPACK_IMPORTED_MODULE_0__/* .options.diffed */ .YM.diffed,a=preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__c */ .YM.__c,v=preact__WEBPACK_IMPORTED_MODULE_0__/* .options.unmount */ .YM.unmount;function m(t,r){preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__h */ .YM.__h&&preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__h */ .YM.__h(u,t,o||r),o=0;var i=u.__H||(u.__H={__:[],__h:[]});return t>=i.__.length&&i.__.push({}),i.__[t]}function l(n){return o=1,p(w,n)}function p(n,r,o){var i=m(t++,2);return i.t=n,i.__c||(i.__=[o?o(r):w(void 0,r),function(n){var t=i.t(i.__[0],n);i.__[0]!==t&&(i.__=[t,i.__[1]],i.__c.setState({}))}],i.__c=u),i.__}function y(r,o){var i=m(t++,3);!preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__s */ .YM.__s&&k(i.__H,o)&&(i.__=r,i.__H=o,u.__H.__h.push(i))}function h(r,o){var i=m(t++,4);!preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__s */ .YM.__s&&k(i.__H,o)&&(i.__=r,i.__H=o,u.__h.push(i))}function s(n){return o=5,d(function(){return{current:n}},[])}function _(n,t,u){o=6,h(function(){"function"==typeof n?n(t()):n&&(n.current=t())},null==u?u:u.concat(n))}function d(n,u){var r=m(t++,7);return k(r.__H,u)&&(r.__=n(),r.__H=u,r.__h=n),r.__}function A(n,t){return o=8,d(function(){return n},t)}function F(n){var r=u.context[n.__c],o=m(t++,9);return o.c=n,r?(null==o.__&&(o.__=!0,r.sub(u)),r.props.value):n.__}function T(t,u){n.useDebugValue&&n.useDebugValue(u?u(t):t)}function q(n){var r=m(t++,10),o=l();return r.__=n,u.componentDidCatch||(u.componentDidCatch=function(n){r.__&&r.__(n),o[1](n)}),[o[0],function(){o[1](void 0)}]}function x(){for(var t;t=i.shift();)if(t.__P)try{t.__H.__h.forEach(g),t.__H.__h.forEach(j),t.__H.__h=[]}catch(u){t.__H.__h=[],preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__e */ .YM.__e(u,t.__v)}}preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__b */ .YM.__b=function(n){u=null,c&&c(n)},preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__r */ .YM.__r=function(n){f&&f(n),t=0;var r=(u=n.__c).__H;r&&(r.__h.forEach(g),r.__h.forEach(j),r.__h=[])},preact__WEBPACK_IMPORTED_MODULE_0__/* .options.diffed */ .YM.diffed=function(t){e&&e(t);var o=t.__c;o&&o.__H&&o.__H.__h.length&&(1!==i.push(o)&&r===preact__WEBPACK_IMPORTED_MODULE_0__/* .options.requestAnimationFrame */ .YM.requestAnimationFrame||((r=preact__WEBPACK_IMPORTED_MODULE_0__/* .options.requestAnimationFrame */ .YM.requestAnimationFrame)||function(n){var t,u=function(){clearTimeout(r),b&&cancelAnimationFrame(t),setTimeout(n)},r=setTimeout(u,100);b&&(t=requestAnimationFrame(u))})(x)),u=null},preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__c */ .YM.__c=function(t,u){u.some(function(t){try{t.__h.forEach(g),t.__h=t.__h.filter(function(n){return!n.__||j(n)})}catch(r){u.some(function(n){n.__h&&(n.__h=[])}),u=[],preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__e */ .YM.__e(r,t.__v)}}),a&&a(t,u)},preact__WEBPACK_IMPORTED_MODULE_0__/* .options.unmount */ .YM.unmount=function(t){v&&v(t);var u,r=t.__c;r&&r.__H&&(r.__H.__.forEach(function(n){try{g(n)}catch(n){u=n}}),u&&preact__WEBPACK_IMPORTED_MODULE_0__/* .options.__e */ .YM.__e(u,r.__v))};var b="function"==typeof requestAnimationFrame;function g(n){var t=u,r=n.__c;"function"==typeof r&&(n.__c=void 0,r()),u=t}function j(n){var t=u;n.__c=n.__(),u=t}function k(n,t){return!n||n.length!==t.length||t.some(function(t,u){return t!==n[u]})}function w(n,t){return"function"==typeof t?t(n):t}
//# sourceMappingURL=hooks.module.js.map


/***/ }),

/***/ 871:
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "HY": () => (/* reexport safe */ preact__WEBPACK_IMPORTED_MODULE_0__.HY),
/* harmony export */   "tZ": () => (/* binding */ e),
/* harmony export */   "BX": () => (/* binding */ e)
/* harmony export */ });
/* unused harmony export jsxDEV */
/* harmony import */ var preact__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(934);
var o=0;function e(_,e,n,t,f){var l,s,u={};for(s in e)"ref"==s?l=e[s]:u[s]=e[s];var a={type:_,props:u,key:n,ref:l,__k:null,__:null,__b:0,__e:null,__d:void 0,__c:null,__h:null,constructor:void 0,__v:--o,__source:t,__self:f};if("function"==typeof _&&(l=_.defaultProps))for(s in l)void 0===u[s]&&(u[s]=l[s]);return preact__WEBPACK_IMPORTED_MODULE_0__/* .options.vnode */ .YM.vnode&&preact__WEBPACK_IMPORTED_MODULE_0__/* .options.vnode */ .YM.vnode(a),a}
//# sourceMappingURL=jsxRuntime.module.js.map


/***/ })

/******/ });
/************************************************************************/
/******/ // The module cache
/******/ var __webpack_module_cache__ = {};
/******/ 
/******/ // The require function
/******/ function __webpack_require__(moduleId) {
/******/ 	// Check if module is in cache
/******/ 	var cachedModule = __webpack_module_cache__[moduleId];
/******/ 	if (cachedModule !== undefined) {
/******/ 		return cachedModule.exports;
/******/ 	}
/******/ 	// Create a new module (and put it into the cache)
/******/ 	var module = __webpack_module_cache__[moduleId] = {
/******/ 		// no module.id needed
/******/ 		// no module.loaded needed
/******/ 		exports: {}
/******/ 	};
/******/ 
/******/ 	// Execute the module function
/******/ 	__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 
/******/ 	// Return the exports of the module
/******/ 	return module.exports;
/******/ }
/******/ 
/************************************************************************/
/******/ /* webpack/runtime/define property getters */
/******/ (() => {
/******/ 	// define getter functions for harmony exports
/******/ 	__webpack_require__.d = (exports, definition) => {
/******/ 		for(var key in definition) {
/******/ 			if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 				Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 			}
/******/ 		}
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/hasOwnProperty shorthand */
/******/ (() => {
/******/ 	__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ })();
/******/ 
/******/ /* webpack/runtime/make namespace object */
/******/ (() => {
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = (exports) => {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/ })();
/******/ 
/******/ /* webpack/runtime/publicPath */
/******/ (() => {
/******/ 	__webpack_require__.p = "/";
/******/ })();
/******/ 
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {

// EXPORTS
__webpack_require__.d(__webpack_exports__, {
  "X": () => (/* binding */ renderPage)
});

// EXTERNAL MODULE: ./node_modules/preact/jsx-runtime/dist/jsxRuntime.mjs
var jsxRuntime = __webpack_require__(871);
// EXTERNAL MODULE: ./node_modules/preact/dist/preact.mjs
var preact = __webpack_require__(934);
;// CONCATENATED MODULE: ./node_modules/preact-render-to-string/dist/index.mjs
var r=/acit|ex(?:s|g|n|p|$)|rph|grid|ows|mnc|ntw|ine[ch]|zoo|^ord|^--/i,n=/[&<>"]/;function o(e){var t=String(e);return n.test(t)?t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"):t}var a=function(e,t){return String(e).replace(/(\n+)/g,"$1"+(t||"\t"))},i=function(e,t,r){return String(e).length>(t||40)||!r&&-1!==String(e).indexOf("\n")||-1!==String(e).indexOf("<")},l={};function s(e){var t="";for(var n in e){var o=e[n];null!=o&&""!==o&&(t&&(t+=" "),t+="-"==n[0]?n:l[n]||(l[n]=n.replace(/([A-Z])/g,"-$1").toLowerCase()),t+=": ",t+=o,"number"==typeof o&&!1===r.test(n)&&(t+="px"),t+=";")}return t||void 0}function f(e,t){for(var r in t)e[r]=t[r];return e}function u(e,t){return Array.isArray(t)?t.reduce(u,e):null!=t&&!1!==t&&e.push(t),e}var c={shallow:!0},p=[],_=/^(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/,v=/[\s\n\\/='"\0<>]/,d=function(){};m.render=m;var g=function(e,t){return m(e,t,c)},h=[];function m(t,r,n){r=r||{},n=n||{};var o=preact/* options.__s */.YM.__s;preact/* options.__s */.YM.__s=!0;var a=x(t,r,n);return preact/* options.__c */.YM.__c&&preact/* options.__c */.YM.__c(t,h),h.length=0,preact/* options.__s */.YM.__s=o,a}function x(r,n,l,c,g,h){if(null==r||"boolean"==typeof r)return"";if("object"!=typeof r)return o(r);var m=l.pretty,y=m&&"string"==typeof m?m:"\t";if(Array.isArray(r)){for(var b="",S=0;S<r.length;S++)m&&S>0&&(b+="\n"),b+=x(r[S],n,l,c,g,h);return b}var w,k=r.type,O=r.props,C=!1;if("function"==typeof k){if(C=!0,!l.shallow||!c&&!1!==l.renderRootComponent){if(k===preact/* Fragment */.HY){var A=[];return u(A,r.props.children),x(A,n,l,!1!==l.shallowHighOrder,g,h)}var H,j=r.__c={__v:r,context:n,props:r.props,setState:d,forceUpdate:d,__h:[]};if(preact/* options.__b */.YM.__b&&preact/* options.__b */.YM.__b(r),preact/* options.__r */.YM.__r&&preact/* options.__r */.YM.__r(r),k.prototype&&"function"==typeof k.prototype.render){var F=k.contextType,M=F&&n[F.__c],T=null!=F?M?M.props.value:F.__:n;(j=r.__c=new k(O,T)).__v=r,j._dirty=j.__d=!0,j.props=O,null==j.state&&(j.state={}),null==j._nextState&&null==j.__s&&(j._nextState=j.__s=j.state),j.context=T,k.getDerivedStateFromProps?j.state=f(f({},j.state),k.getDerivedStateFromProps(j.props,j.state)):j.componentWillMount&&(j.componentWillMount(),j.state=j._nextState!==j.state?j._nextState:j.__s!==j.state?j.__s:j.state),H=j.render(j.props,j.state,j.context)}else{var $=k.contextType,L=$&&n[$.__c];H=k.call(r.__c,O,null!=$?L?L.props.value:$.__:n)}return j.getChildContext&&(n=f(f({},n),j.getChildContext())),preact/* options.diffed */.YM.diffed&&preact/* options.diffed */.YM.diffed(r),x(H,n,l,!1!==l.shallowHighOrder,g,h)}k=(w=k).displayName||w!==Function&&w.name||function(e){var t=(Function.prototype.toString.call(e).match(/^\s*function\s+([^( ]+)/)||"")[1];if(!t){for(var r=-1,n=p.length;n--;)if(p[n]===e){r=n;break}r<0&&(r=p.push(e)-1),t="UnnamedComponent"+r}return t}(w)}var E,D,N="<"+k;if(O){var P=Object.keys(O);l&&!0===l.sortAttributes&&P.sort();for(var R=0;R<P.length;R++){var U=P[R],W=O[U];if("children"!==U){if(!v.test(U)&&(l&&l.allAttributes||"key"!==U&&"ref"!==U&&"__self"!==U&&"__source"!==U)){if("defaultValue"===U)U="value";else if("className"===U){if(void 0!==O.class)continue;U="class"}else g&&U.match(/^xlink:?./)&&(U=U.toLowerCase().replace(/^xlink:?/,"xlink:"));if("htmlFor"===U){if(O.for)continue;U="for"}"style"===U&&W&&"object"==typeof W&&(W=s(W)),"a"===U[0]&&"r"===U[1]&&"boolean"==typeof W&&(W=String(W));var q=l.attributeHook&&l.attributeHook(U,W,n,l,C);if(q||""===q)N+=q;else if("dangerouslySetInnerHTML"===U)D=W&&W.__html;else if("textarea"===k&&"value"===U)E=W;else if((W||0===W||""===W)&&"function"!=typeof W){if(!(!0!==W&&""!==W||(W=U,l&&l.xml))){N+=" "+U;continue}if("value"===U){if("select"===k){h=W;continue}"option"===k&&h==W&&(N+=" selected")}N+=" "+U+'="'+o(W)+'"'}}}else E=W}}if(m){var z=N.replace(/\n\s*/," ");z===N||~z.indexOf("\n")?m&&~N.indexOf("\n")&&(N+="\n"):N=z}if(N+=">",v.test(k))throw new Error(k+" is not a valid HTML tag name in "+N);var I,V=_.test(k)||l.voidElements&&l.voidElements.test(k),Z=[];if(D)m&&i(D)&&(D="\n"+y+a(D,y)),N+=D;else if(null!=E&&u(I=[],E).length){for(var B=m&&~N.indexOf("\n"),G=!1,J=0;J<I.length;J++){var K=I[J];if(null!=K&&!1!==K){var Q=x(K,n,l,!0,"svg"===k||"foreignObject"!==k&&g,h);if(m&&!B&&i(Q)&&(B=!0),Q)if(m){var X=Q.length>0&&"<"!=Q[0];G&&X?Z[Z.length-1]+=Q:Z.push(Q),G=X}else Z.push(Q)}}if(m&&B)for(var Y=Z.length;Y--;)Z[Y]="\n"+y+a(Z[Y],y)}if(Z.length||D)N+=Z.join("");else if(l&&l.xml)return N.substring(0,N.length-1)+" />";return!V||I||D?(m&&~N.indexOf("\n")&&(N+="\n"),N+="</"+k+">"):N=N.replace(/>$/," />"),N}m.shallowRender=g;/* harmony default export */ const dist = ((/* unused pure expression or super */ null && (m)));
//# sourceMappingURL=index.module.js.map

;// CONCATENATED MODULE: ./www/src/components/page-wrap.tsx

function PageWrap({ children }) {
    return (0,jsxRuntime/* jsx */.tZ)("div", { className: "page py-4", children: children }, void 0);
}

;// CONCATENATED MODULE: ./www/src/i18n/i18n.tsx
const LANG = global._SSR_LANG;
const I18N_LANG_NAMES = {
    en: 'English',
    ru: 'Русский',
};
const I18N_LANG_NAME = I18N_LANG_NAMES[LANG];
const I18N_DASHBOARD = { en: 'Dashboard', ru: 'Самое важное' }[LANG];
const I18N_REGION = { en: 'Region', ru: 'Регион' }[LANG];
const I18N_UNTIL_DAY_RESET = { en: 'Until Day Reset', ru: 'До нового дня' }[LANG];
const I18N_ALCHEMY_CALC = { en: 'Alchemy Calculator', ru: 'Калькулятор алхимии' }[LANG];
const I18N_WHAT_TO_FARM = { en: 'What to Farm', ru: 'Что фармить' }[LANG];
const I18N_BUILDS = { en: 'Builds', ru: 'Сборки персонажей' }[LANG];
const I18N_ASIA = { en: 'Asia', ru: 'Азия' }[LANG];
const I18N_NORH_AMERICA = { en: 'North America', ru: 'Северная Америка' }[LANG];
const I18N_EUROPE = { en: 'Europe', ru: 'Европа' }[LANG];
const i18n_I18N_MINUTE = { en: 'minute', ru: 'минута' }[LANG];
const i18n_I18N_MINUTES = { en: 'minutes', ru: 'минуты' }[LANG];
const i18n_I18N_MINUTES_3 = { en: 'minutes', ru: 'минут' }[LANG];
const i18n_I18N_HOUR = { en: 'hour', ru: 'час' }[LANG];
const i18n_I18N_HOURS = { en: 'hours', ru: 'часа' }[LANG];
const i18n_I18N_HOURS_3 = { en: 'hours', ru: 'часов' }[LANG];
const I18N_TODAY = { en: 'today', ru: 'сегодня' }[LANG];
const I18N_WEEKDAYS = {
    en: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
}[LANG];
const I18N_TOMORROW = { en: 'tomorrow', ru: 'завтра' }[LANG];
const I18N_DUNGEONS = { en: 'Dungeons', ru: 'Подземелья' }[LANG];
const I18N_TALENTS = { en: 'Talents', ru: 'Таланты' }[LANG];
const I18N_WEAPONS = { en: 'Weapons', ru: 'Оружие' }[LANG];
const I18N_WHY_ADD_TO_FAVS_TIP = {
    en: 'Add characters, weapons or items to your favorites to see them marked here.',
    ru: 'Добавьте персонажей, оружие и предметы в избранные, чтобы отметить их здесь',
}[LANG];
const I18N_FAV_CHARACTERS = { en: 'Favorite characters', ru: 'Избранные персонажи' }[LANG];
const I18N_ARTIFACTS = { en: 'Artifacts', ru: 'Артефакты' }[LANG];
const I18N_ART_STATS_PRIORITY = { en: 'Artifact stats priority', ru: 'Приоритетные главстаты' }[LANG];
const I18N_SUBSTATS_PRIORITY = { en: 'Substats priority', ru: 'Приоритетные сабстаты' }[LANG];
const I18N_TALENTS_PRIORITY = { en: 'Talents Priority', ru: 'Приоритетные умения' }[LANG];
const I18N_ASC_MATERIALS = { en: 'Ascension materials', ru: 'Материалы возвышения' }[LANG];
const I18N_FULL_BUILD_INFO = { en: 'Full build info', ru: 'Полная информация о билде' }[LANG];
const I18N_CHAR_LORE = { en: 'Character lore', ru: 'Лор персонажа' }[LANG];
const I18N_MORE_ON_BUILDS_PAGE = {
    en: 'more on build page',
    ru: 'продолжение на странице билда',
}[LANG];
const I18N_BACK = { en: 'Back', ru: 'Назад' }[LANG];
const I18N_NOTES = { en: 'Notes', ru: 'Примечания' }[LANG];
const artTypeNamesRU = {
    flower: 'цветок',
    plume: 'перо',
    sands: 'часы',
    goblet: 'кубок',
    circlet: 'корона',
};
const I18N_ART_TYPE = {
    en: (code) => code,
    ru: (code) => artTypeNamesRU[code],
}[LANG];
const statNamesRu = {
    def: 'защита',
    'def%': '% защиты',
    dmg: 'урон',
    'dmg%': '% урона',
    atk: 'атака',
    'atk%': '% атаки',
    hp: 'ХП',
    'hp%': '% ХП',
    em: 'мастерство стихий',
    er: 'восстановление энергии',
    'er%': '% восстановления энергии',
    healing: 'лечение',
    'healing%': '% лечения',
    'crit-rate': 'шанс крита',
    'crit-rate%': '%шанса крита',
    'crit-dmg': 'крит урон',
    'crit-dmg%': '% крит урона',
    'phys-dmg': 'физ урон',
    'cryo-dmg': 'крио урон',
    'geo-dmg': 'гео урон',
    'anemo-dmg': 'анемо урон',
    'hydro-dmg': 'гидро урон',
    'electro-dmg': 'электро урон',
    'pyro-dmg': 'пиро урон',
    'phys-dmg%': '% физ урона',
    'cryo-dmg%': '% крио урона',
    'geo-dmg%': '% гео урона',
    'anemo-dmg%': '% анемо урона',
    'hydro-dmg%': '% гидро урона',
    'electro-dmg%': '% электро урона',
    'pyro-dmg%': '% пиро урона',
};
const I18N_STAT_NAME = {
    en: (code) => code.replace(/-/g, ' '),
    ru: (code) => statNamesRu[code] ?? code,
}[LANG];
const talentTypesNamesRU = {
    attack: 'обычная атака',
    skill: 'элементальный навык',
    burst: 'взрыв стихии',
};
const I18N_TALENT_NAME = {
    en: (code) => code,
    ru: (code) => talentTypesNamesRU[code],
}[LANG];
const I18N_CONJUCTIONS = {
    en: { or: 'or', and: 'and' },
    ru: { or: 'или', and: 'и' },
}[LANG];
const I18N_RECOMENDED_FOR = { en: 'Recommended for', ru: 'Рекомендуется для' }[LANG];
const I18N_FOR_NOBODY = { en: 'Nobody', ru: 'Никому' }[LANG];
const I18N_SOURCE = { en: 'Source', ru: 'Источник' }[LANG];
const I18N_SCROLL_TO_ZOOM = { en: 'Scroll to zoom', ru: 'Зум колёсиком' }[LANG];
const I18N_PINCH_TO_ZOOM = { en: 'Pinch to zoom', ru: 'Зум щипком' }[LANG];
const I18N_ERROR = { en: 'Error, reload page', ru: 'Ошибка, перезагрузите страницу' }[LANG];
const I18N_PIECE_BONUS = {
    en: (n) => `${n} piece bonus`,
    ru: (n) => `Бонус ${n} части`,
}[LANG];
const I18N_PIECES_BONUS = {
    en: (n) => `${n} pieces bonus`,
    ru: (n) => `Бонус ${n} частей`,
}[LANG];
const I18N_BASE_ATTACK = { en: 'Base attack', ru: 'Базовая атака' }[LANG];
const I18N_SECONDARY_STAT = { en: 'Secondary Stat', ru: 'Пассивная способность' }[LANG];
const I18N_MAP_CODES_NAME = {
    en: { teyvat: 'Teyvat', enkanomiya: 'Enkanomiya' },
    ru: { teyvat: 'Тейват', enkanomiya: 'Энканомия' },
}[LANG];
const I18N_CHAR_BUILD_RECS = {
    en: 'Character builds recomendations',
    ru: 'Рекомендуемые сборки персонажей',
}[LANG];
const I18N_SELECT_CHAR_ABOVE = { en: 'Select character above', ru: 'Выберите персонажа' }[LANG];
const I18N_BUILD_RECS_FOR = { en: 'build recomendations', ru: 'билд' }[LANG];
const I18N_BASED_ON_GIHT = {
    en: "Based on Genshin Impact Helper Team's Character Builds",
    ru: 'Основано на табличке Геншин Импакт Хелпер Тимы (англ.)',
}[LANG];
const I18N_ABOUT_SITE = { en: 'About', ru: 'О сайте' }[LANG];
const I18N_CREATED_BY_US = {
    en: 'Designed and coded by Absolute Evil Studio',
    ru: 'Задизайнено и закожено в Абсолют Ивел студии',
}[LANG];
const weaponTypeNamesRU = {
    claymore: 'Двуручный меч',
    sword: 'Меч',
    catalyst: 'Катализатор',
    polearm: 'Копье',
    bow: 'Лук',
};
const I18N_WEAPON_TYPE_NAME = {
    en: (code) => code,
    ru: (code) => weaponTypeNamesRU[code],
}[LANG];
const weaponObtainSourceNamesRU = {
    wishes: 'молитвы',
    'event-wishes': 'молитвы события',
    events: 'события',
    'battle-pass': 'батл-пасс',
    'in-game-shop': 'внутриигровой магазин',
    forging: 'ковка',
    fishing: 'рыболовля',
    'npc-shop': 'магазин НПС',
    chests: 'сундуки',
    quests: 'квесты',
    puzzles: 'паззл',
    investigation: 'исследование мира',
    'adventure-rank-10': '10 ранг приключений',
    playstation: 'плейстейшн',
};
const I18N_WEAPON_OBTAIN_SOURCE_NAME = {
    en: (code) => code.replace(/-/g, ' ').replace(/\bnpc\b/, 'NPC'),
    ru: (code) => weaponObtainSourceNamesRU[code],
}[LANG];
const I18N_OBTAINED_DURING_STORYLINE = {
    en: 'Obtained during storyline quests',
    ru: 'Выдаётся во время прохождения сюжетных заданий',
}[LANG];

;// CONCATENATED MODULE: ./www/src/containers/footer.tsx


function Footer() {
    return ((0,jsxRuntime/* jsx */.tZ)("footer", { className: "mt-auto bg-dark", children: (0,jsxRuntime/* jsx */.tZ)("div", { className: "container my-3 opacity-75", children: (0,jsxRuntime/* jsx */.tZ)("div", { className: "text-center", children: I18N_CREATED_BY_US }, void 0) }, void 0) }, void 0));
}

// EXTERNAL MODULE: ./node_modules/preact/hooks/dist/hooks.mjs
var hooks = __webpack_require__(954);
;// CONCATENATED MODULE: ./www/src/api/generated.js

const GENERATED_DATA_HASH = "e30cfc54"

/** @type {import('#lib/parsing/combine').CharacterShortInfo[]} */
const charactersShortList = [
	{
		"code": "amber",
		"elementCode": "pyro",
		"weaponTypeCode": "bow",
		"rarity": 4
	},
	{
		"code": "barbara",
		"elementCode": "hydro",
		"weaponTypeCode": "catalyst",
		"rarity": 4
	},
	{
		"code": "beidou",
		"elementCode": "electro",
		"weaponTypeCode": "claymore",
		"rarity": 4
	},
	{
		"code": "bennett",
		"elementCode": "pyro",
		"weaponTypeCode": "sword",
		"rarity": 4
	},
	{
		"code": "chongyun",
		"elementCode": "cryo",
		"weaponTypeCode": "claymore",
		"rarity": 4
	},
	{
		"code": "diluc",
		"elementCode": "pyro",
		"weaponTypeCode": "claymore",
		"rarity": 5
	},
	{
		"code": "fischl",
		"elementCode": "electro",
		"weaponTypeCode": "bow",
		"rarity": 4
	},
	{
		"code": "jean",
		"elementCode": "anemo",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "kaeya",
		"elementCode": "cryo",
		"weaponTypeCode": "sword",
		"rarity": 4
	},
	{
		"code": "keqing",
		"elementCode": "electro",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "klee",
		"elementCode": "pyro",
		"weaponTypeCode": "catalyst",
		"rarity": 5
	},
	{
		"code": "lisa",
		"elementCode": "electro",
		"weaponTypeCode": "catalyst",
		"rarity": 4
	},
	{
		"code": "mona",
		"elementCode": "hydro",
		"weaponTypeCode": "catalyst",
		"rarity": 5
	},
	{
		"code": "ningguang",
		"elementCode": "geo",
		"weaponTypeCode": "catalyst",
		"rarity": 4
	},
	{
		"code": "noelle",
		"elementCode": "geo",
		"weaponTypeCode": "claymore",
		"rarity": 4
	},
	{
		"code": "qiqi",
		"elementCode": "cryo",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "razor",
		"elementCode": "electro",
		"weaponTypeCode": "claymore",
		"rarity": 4
	},
	{
		"code": "sucrose",
		"elementCode": "anemo",
		"weaponTypeCode": "catalyst",
		"rarity": 4
	},
	{
		"code": "traveler-anemo",
		"elementCode": "anemo",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "traveler-electro",
		"elementCode": "electro",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "traveler-geo",
		"elementCode": "geo",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "venti",
		"elementCode": "anemo",
		"weaponTypeCode": "bow",
		"rarity": 5
	},
	{
		"code": "xiangling",
		"elementCode": "pyro",
		"weaponTypeCode": "polearm",
		"rarity": 4
	},
	{
		"code": "xingqiu",
		"elementCode": "hydro",
		"weaponTypeCode": "sword",
		"rarity": 4
	},
	{
		"code": "diona",
		"elementCode": "cryo",
		"weaponTypeCode": "bow",
		"rarity": 4
	},
	{
		"code": "tartaglia",
		"elementCode": "hydro",
		"weaponTypeCode": "bow",
		"rarity": 5
	},
	{
		"code": "xinyan",
		"elementCode": "pyro",
		"weaponTypeCode": "claymore",
		"rarity": 4
	},
	{
		"code": "zhongli",
		"elementCode": "geo",
		"weaponTypeCode": "polearm",
		"rarity": 5
	},
	{
		"code": "albedo",
		"elementCode": "geo",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "ganyu",
		"elementCode": "cryo",
		"weaponTypeCode": "bow",
		"rarity": 5
	},
	{
		"code": "hu-tao",
		"elementCode": "pyro",
		"weaponTypeCode": "polearm",
		"rarity": 5
	},
	{
		"code": "xiao",
		"elementCode": "anemo",
		"weaponTypeCode": "polearm",
		"rarity": 5
	},
	{
		"code": "rosaria",
		"elementCode": "cryo",
		"weaponTypeCode": "polearm",
		"rarity": 4
	},
	{
		"code": "eula",
		"elementCode": "cryo",
		"weaponTypeCode": "claymore",
		"rarity": 5
	},
	{
		"code": "yanfei",
		"elementCode": "pyro",
		"weaponTypeCode": "catalyst",
		"rarity": 4
	},
	{
		"code": "kazuha",
		"elementCode": "anemo",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "ayaka",
		"elementCode": "cryo",
		"weaponTypeCode": "sword",
		"rarity": 5
	},
	{
		"code": "sayu",
		"elementCode": "anemo",
		"weaponTypeCode": "claymore",
		"rarity": 4
	},
	{
		"code": "yoimiya",
		"elementCode": "pyro",
		"weaponTypeCode": "bow",
		"rarity": 5
	},
	{
		"code": "aloy",
		"elementCode": "cryo",
		"weaponTypeCode": "bow",
		"rarity": 5
	},
	{
		"code": "kokomi",
		"elementCode": "hydro",
		"weaponTypeCode": "catalyst",
		"rarity": 5
	},
	{
		"code": "kujou-sara",
		"elementCode": "electro",
		"weaponTypeCode": "bow",
		"rarity": 4
	},
	{
		"code": "raiden-shogun",
		"elementCode": "electro",
		"weaponTypeCode": "polearm",
		"rarity": 5
	},
	{
		"code": "thoma",
		"elementCode": "pyro",
		"weaponTypeCode": "polearm",
		"rarity": 4
	},
	{
		"code": "gorou",
		"elementCode": "geo",
		"weaponTypeCode": "bow",
		"rarity": 4
	},
	{
		"code": "itto",
		"elementCode": "geo",
		"weaponTypeCode": "claymore",
		"rarity": 5
	},
	{
		"code": "shenhe",
		"elementCode": "cryo",
		"weaponTypeCode": "polearm",
		"rarity": 5
	},
	{
		"code": "yun-jin",
		"elementCode": "geo",
		"weaponTypeCode": "polearm",
		"rarity": 4
	},
	{
		"code": "yae-miko",
		"elementCode": "electro",
		"weaponTypeCode": "catalyst",
		"rarity": 5
	}
]

;// CONCATENATED MODULE: ./www/src/routes/paths.js


const paths = /** @type {const} */ ({
	front: [''],
	builds: ['/builds'],
	buildCharacters: ['/builds/', ['code', charactersShortList.map(x => x.code)]],
	equipment: ['/equipment'],
})

/**
 * @param {import('./router').RoutePath} path
 * @param {string} url
 * @returns {Record<string, string> | null}
 */
function matchPath(path, url) {
	if (path.length === 0) return null
	let rem = url
	const props = /**@type {Record<string, string>}*/ ({})
	for (const part of path) {
		let matched = true //true на случай пустых variants
		if (typeof part === 'string') {
			;[rem, matched] = withoutPrefix(rem, part)
		} else {
			const [name, variants] = part
			for (const variant of variants) {
				;[rem, matched] = withoutPrefix(rem, variant)
				if (matched) {
					props[name] = variant
					break
				}
			}
		}
		if (!matched) return null
	}
	return !rem || rem === '/' ? props : null
}

/**
 * @param {string} prefix
 * @param {import('./router').RoutePath} path
 * @param {number} [fromIndex]
 * @returns {string[]}
 */
function pathToStrings(prefix, path, fromIndex = 0) {
	if (path.length === 0) return []
	if (fromIndex >= path.length) return [prefix]

	const part = path[fromIndex]
	if (typeof part === 'string') {
		return pathToStrings(prefix + part, path, fromIndex + 1)
	} else {
		const [, variants] = part
		return variants.flatMap(x => pathToStrings(prefix + x, path, fromIndex + 1))
	}
}

/**
 * @param {string} url
 * @param {string} prefix
 * @returns {[string, boolean]}
 */
function withoutPrefix(url, prefix) {
	return url.startsWith(prefix) ? [url.slice(prefix.length), true] : [url, false]
}

;// CONCATENATED MODULE: ./www/src/routes/router.tsx




const URL_LANG_PREFIX = makeUrlLangPrefix(global._SSR_LANG);
function findRoutedComponent(routes, url) {
    for (const [route, comp] of routes) {
        const props = matchPath(route, url);
        if (props)
            return [comp, props];
    }
    return null;
}
function pathSearchHash(url) {
    return url.pathname + url.search + url.hash;
}
function handleAnchorClick(e, routes) {
    if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey || e.button !== 0)
        return;
    const a = e.target instanceof Element && e.target.closest('a');
    if (a && a.href && (!a.target || a.target === '_self')) {
        const url = new URL(a.href);
        if (url.origin === location.origin) {
            if (findRoutedComponent(routes, url.pathname)) {
                if (pathSearchHash(location) !== pathSearchHash(url))
                    history.pushState(null, '', pathSearchHash(url));
                e.preventDefault();
                return true;
            }
        }
    }
}
function useRouter(routes) {
    const [, forceUpdate] = (0,hooks/* useState */.eJ)(0);
    (0,hooks/* useEffect */.d4)(() => {
        function onClick(e) {
            const handled = handleAnchorClick(e, routes);
            if (handled)
                forceUpdate(x => x + 1);
        }
        function onPopState(e) {
            forceUpdate(x => x + 1);
        }
        addEventListener('click', onClick);
        addEventListener('popstate', onPopState);
        return () => {
            removeEventListener('click', onClick);
            removeEventListener('popstate', onPopState);
        };
    }, [routes]);
    const res = findRoutedComponent(routes, location.pathname);
    if (!res)
        return '404';
    const [Comp, props] = res;
    return (0,jsxRuntime/* jsx */.tZ)(Comp, { ...props }, void 0);
}
const route = (path, comp) => [[URL_LANG_PREFIX, ...path], comp];
function makeUrlLangPrefix(lang) {
    return lang === 'en' ? '' : '/ru';
}
function makeLocationHrefForLang(lang) {
    const url = location.pathname + location.search + location.hash;
    const curPrefix = URL_LANG_PREFIX;
    const newPrefix = makeUrlLangPrefix(lang);
    let newUrl = newPrefix + (url.startsWith(curPrefix) ? url.slice(curPrefix.length) : url);
    if (newUrl === '')
        newUrl = '/';
    return newUrl;
}
function A(props) {
    props = Object.assign({}, props);
    // @ts-ignore
    props.ref = props.innerRef;
    delete props.innerRef;
    if (props.href)
        props.href = URL_LANG_PREFIX + props.href;
    // тайпскриптовый JSX-трансформер какой-то туповатый:
    // он для <a {...props}/> генерит лишний Object.assign({}, props)
    return (0,preact.h)('a', props);
}

;// CONCATENATED MODULE: ./lib/utils/collections.js
/**
 * @template T
 * @param {T[]} arr
 * @returns {T[]}
 */
function arrSimpleUniq(arr) {
	for (let i = arr.length - 1; i >= 0; i--) {
		const index = arr.indexOf(arr[i], i + 1)
		if (index < i) arr.splice(i, 1)
	}
	return arr
}

/**
 * @template T
 * @param {T[]} arr
 * @param {T[]} items
 * @returns {number}
 */
function arrPushIfNew(arr, ...items) {
	for (let i = 0; i < items.length; i++)
		if (!arr.includes(items[i])) {
			arr.push(items[i])
		}
	return arr.length
}

/**
 * @template TKey
 * @template TVal
 * @param {Map<TKey, TVal[]>} map
 * @param {TKey} key
 * @param {TVal} val
 * @returns {TVal[]}
 */
function mappedArrPush(map, key, val) {
	let values = map.get(key)
	if (values) {
		values.push(val)
	} else {
		values = [val]
		map.set(key, values)
	}
	return values
}

/**
 * @template T
 * @param {T[]} arr
 * @param {(item:T) => boolean} func
 * @returns {T[][]}
 */
function arrSplitFn(arr, func) {
	const res = /**@type {T[][]}*/ ([[]])
	for (let i = 0; i < arr.length; i++) {
		const item = arr[i]
		if (func(item)) res.push([])
		else res[res.length - 1].push(item)
	}
	return res
}

/**
 * @param {unknown[]} a
 * @param {unknown[]} b
 */
function arrShallowEqualAsSets(a, b) {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) if (!b.includes(a[i])) return false
	return true
}

/**
 * @param {unknown[]} a
 * @param {unknown[]} b
 */
function arrShallowEqual(a, b) {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
	return true
}

/**
 * @template {string} TKey
 * @template TVal
 * @param {Record<TKey, TVal>} obj
 * @param {(a:[TKey,TVal], b:[TKey,TVal]) => number} sortFunc
 * @returns {Record<TKey, TVal>}
 */
function sortObject(obj, sortFunc) {
	const entries = /**@type {[TKey,TVal][]}*/ (Object.entries(obj)).sort(sortFunc)
	for (const key in obj) delete obj[key]
	for (const [key, val] of entries) obj[key] = val
	return obj
}
/**
 * @template T
 * @param {T[]} arr
 * @param {T} item
 * @param {1|-1} [direction]
 * @returns {T}
 */
function arrGetAfter(arr, item, direction = 1) {
	const index = arr.indexOf(item)
	return arr[(index + direction + arr.length) % arr.length]
}

/**
 * @template TKey
 * @template TVal
 * @param {Map<TKey, TVal>} map
 * @param {TKey} key
 * @param {() => TVal} defaultFunc
 * @returns {TVal}
 */
function mapGetOrSet(map, key, defaultFunc) {
	let value = map.get(key)
	if (value === undefined) {
		value = defaultFunc()
		map.set(key, value)
	}
	return value
}

/**
 * @template {string} TKey
 * @template TVal
 * @param {Partial<Record<TKey, TVal>>} obj
 * @param {TKey} key
 * @param {() => TVal} defaultFunc
 * @returns {TVal}
 */
function objGetOrSet(obj, key, defaultFunc) {
	let value = obj[key]
	if (value === undefined) {
		obj[key] = value = defaultFunc()
	}
	return /**@type {TVal}*/ (value)
}

/**
 * @template T
 * @param {T | T[]} item
 * @returns {T[]}
 */
function arrOrItemToArr(item) {
	return Array.isArray(item) ? item : [item]
}

// EXTERNAL MODULE: ./lib/utils/values.js
var values = __webpack_require__(222);
;// CONCATENATED MODULE: ./www/src/utils/bootstrap.tsx
const BS_BreakpointsCodes = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];
const BS_BreakpointsMap = { xs: 0, sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 };
function BS_getCurrBreakpoint(screenWidth) {
    return (
    //todo правильные типы
    Object.keys(BS_BreakpointsMap).find(k => screenWidth < BS_BreakpointsMap[k]) ||
        'xxl');
}
function BS_isBreakpointLessThen(br, targetBr) {
    return BS_BreakpointsCodes.indexOf(br) <= BS_BreakpointsCodes.indexOf(targetBr);
}

;// CONCATENATED MODULE: ./www/src/utils/hooks.tsx




const PENDING = {};
function isLoaded(value) {
    return value !== PENDING && !(value instanceof Error);
}
function useFetch(loadFunc, args) {
    const controller = (0,hooks/* useRef */.sO)(null);
    const prevArgs = (0,hooks/* useRef */.sO)(null);
    const data = (0,hooks/* useRef */.sO)(PENDING);
    const foceUpdate = useForceUpdate();
    if (prevArgs.current === null || !arrShallowEqual(prevArgs.current, args)) {
        if (controller.current !== null)
            controller.current.abort();
        const ac = new AbortController();
        controller.current = ac;
        const res = loadFunc(ac.signal);
        if ((0,values/* isPromise */.tI)(res)) {
            res.then(res => (data.current = res))
                .catch(err => (data.current = err))
                .finally(foceUpdate);
            data.current = PENDING;
        }
        else {
            data.current = res;
        }
        prevArgs.current = args;
    }
    // абортим при отмонтировании компонента
    (0,hooks/* useEffect */.d4)(() => {
        return () => {
            if (controller.current !== null)
                controller.current.abort();
        };
    }, []);
    return data.current;
}
function useFetchWithPrev(loadFunc, args) {
    const prevDataRef = (0,hooks/* useRef */.sO)(PENDING);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const data = useFetch(loadFunc, args);
    if (isLoaded(data))
        prevDataRef.current = data;
    return [isLoaded(data) ? data : prevDataRef.current, data === PENDING];
}
const useToggle = (initial) => {
    const [flagState, setFlagState] = useState(initial);
    return [flagState, useCallback(() => setFlagState(status => !status), [])];
};
const useClickAway = (ref, callback) => {
    const handleClick = (e) => {
        if (ref.current && e.target instanceof HTMLElement && !ref.current.contains(e.target)) {
            callback && callback();
        }
    };
    (0,hooks/* useEffect */.d4)(() => {
        document.addEventListener('mousedown', handleClick);
        document.addEventListener('touchstart', handleClick);
        // document.addEventListener('click', handleClick)
        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('touchstart', handleClick);
            // document.removeEventListener('click', handleClick)
        };
    });
};
function useWindowSize() {
    const [windowSize, setWindowSize] = (0,hooks/* useState */.eJ)({
        width: window?.innerWidth,
        height: window?.innerHeight,
        breakpoint: BS_getCurrBreakpoint(window?.innerWidth || 0),
    });
    (0,hooks/* useEffect */.d4)(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
                breakpoint: BS_getCurrBreakpoint(window.innerWidth),
            });
        }
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return windowSize;
}
function hooks_useLocalStorage(key, initialValue) {
    const [value, setValueInner] = (0,hooks/* useState */.eJ)(() => {
        try {
            const curRecord = localStorage.getItem(key); //reading 'localStorage' from window may fail with SecurityError
            return curRecord ? JSON.parse(curRecord) : initialValue; //JSON parsing may fail
        }
        catch (ex) {
            console.error(ex);
            return initialValue;
        }
    });
    const setValueAndSave = (0,hooks/* useCallback */.I4)((val) => {
        try {
            localStorage.setItem(key, JSON.stringify(val)); //reading 'localStorage' from window may fail with SecurityError
        }
        catch (ex) {
            // ¯\_(ツ)_/¯
        }
        setValueInner(val);
        dispatchEvent(new CustomEvent('x-local-tab-storage', { detail: { key } }));
    }, [key]);
    (0,hooks/* useEffect */.d4)(() => {
        function onStorage(e) {
            const affectedKey = 'detail' in e ? e.detail.key : e.key;
            if (affectedKey === key) {
                try {
                    const curRecord = localStorage.getItem(key); //reading 'localStorage' from window may fail with SecurityError
                    if (curRecord)
                        setValueInner(JSON.parse(curRecord)); //JSON parsing may fail
                }
                catch (ex) {
                    console.log(ex);
                }
            }
        }
        addEventListener('storage', onStorage);
        addEventListener('x-local-tab-storage', onStorage);
        return () => {
            removeEventListener('storage', onStorage);
            removeEventListener('x-local-tab-storage', onStorage);
        };
    }, [key]);
    return [value, setValueAndSave];
}
function hooks_useHover() {
    const [value, setValue] = (0,hooks/* useState */.eJ)(false);
    const ref = (0,hooks/* useRef */.sO)(null);
    (0,hooks/* useEffect */.d4)(() => {
        const node = ref.current;
        if (!node)
            return;
        const handleMouseOver = () => setValue(true);
        const handleMouseOut = () => setValue(false);
        node.addEventListener('mouseover', handleMouseOver);
        node.addEventListener('mouseout', handleMouseOut);
        return () => {
            setValue(false);
            node.removeEventListener('mouseover', handleMouseOver);
            node.removeEventListener('mouseout', handleMouseOut);
        };
    }, 
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref.current]);
    return [ref, value];
}
const useWindowVisibility = () => {
    const [isVisible, setIsVisible] = (0,hooks/* useState */.eJ)(
    // Focus for first render
     true ? true : 0);
    (0,hooks/* useEffect */.d4)(() => {
        const onVisibilityChange = () => setIsVisible(document.visibilityState === 'visible');
        const onPageHide = () => setIsVisible(false);
        const onPageShow = () => setIsVisible(true);
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('pageshow ', onPageShow);
        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('pageshow ', onPageShow);
        };
    }, []);
    return isVisible;
};
/*
 * not used
 *
export function useInterval(callback: () => void, delay: number | null) {
    const savedCallback = useRef(callback)
    // Remember the latest callback if it changes.
    useLayoutEffect(() => {
        savedCallback.current = callback
    }, [callback])

    // Set up the interval.
    useEffect(() => {
        // Don't schedule if no delay is specified.
        // Note: 0 is a valid value for delay.
        if (!delay && delay !== 0) {
            return
        }

        const id = setInterval(() => savedCallback.current(), delay)
        return () => clearInterval(id)
    }, [delay])
}
*/
function useForceUpdate() {
    const setValue = (0,hooks/* useState */.eJ)(0)[1];
    return (0,hooks/* useRef */.sO)(() => setValue(v => ~v)).current;
}
function useVisibleTicker(callback, interval) {
    const isVisible = useWindowVisibility();
    (0,hooks/* useEffect */.d4)(() => {
        if (!isVisible)
            return;
        let id;
        function callbackInner() {
            callback();
            id = setTimeout(callbackInner, interval - (Date.now() % interval) + 10);
        }
        callbackInner();
        return () => clearTimeout(id);
        // калбек не должен перезапускать таймер
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [interval, isVisible]);
}

;// CONCATENATED MODULE: ./www/src/utils/typography.tsx
const BULLET = '•';
const TIMES = '×';
const LEFT_POINTING = '‹';
const RIGHT_POINTING = '›';
const ELLIPSIS = '…';
const STAR = '★';
const typography_HEART = '♥';
const typography_HEART_EMPTY = '♡';
const VARIATION_SELECTOR = '\uFE0E';

;// CONCATENATED MODULE: ./www/src/components/globe-icon.tsx

function GlobeIcon({ classes = '' }) {
    return ((0,jsxRuntime/* jsx */.tZ)("svg", { class: classes, width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: (0,jsxRuntime/* jsx */.tZ)("path", { "fill-rule": "evenodd", "clip-rule": "evenodd", d: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.8-2.6a7 7 0 0 0 4.2-5.9c-.8.5-1.9.8-3 1.1-.2 1.9-.6 3.5-1.2 4.8ZM9.2 5.6a7 7 0 0 0-4 4.6l1.2.8 1.6.5c0-2.3.5-4.4 1.2-6Zm.9 8.3c.2 1.5.5 2.7.9 3.7l.8 1.2.2.2.2-.2.8-1.2c.4-1 .7-2.2.9-3.7a20 20 0 0 1-3.8 0Zm-2-.3c.1 1.9.5 3.5 1 4.8a7 7 0 0 1-4-5.9c.7.5 1.8.8 3 1.1Zm5.9-1.7a17.8 17.8 0 0 1-4 0c0-2.2.4-4.2 1-5.5l.8-1.2.2-.2.2.2.8 1.2c.6 1.3 1 3.3 1 5.5Zm2-.4c0-2.3-.5-4.4-1.2-6a7 7 0 0 1 4 4.7l-1.2.8-1.6.5Z", fill: "currentColor" }, void 0) }, void 0));
}

;// CONCATENATED MODULE: ./www/src/components/nav.tsx







function Nav({ isNavExpanded }) {
    const [isExpanded, setIsExpanded] = (0,hooks/* useState */.eJ)(false);
    const ddRef = (0,hooks/* useRef */.sO)(null);
    const closeDd = (0,hooks/* useCallback */.I4)(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded]);
    const openDd = (0,hooks/* useCallback */.I4)(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded]);
    // TODO клик мимо компонента
    useClickAway(ddRef, closeDd);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: `collapse navbar-collapse ${isNavExpanded ? 'show' : ''}`, children: [(0,jsxRuntime/* jsxs */.BX)("ul", { className: "navbar-nav me-auto mb-2 mb-md-0", children: [(0,jsxRuntime/* jsx */.tZ)("li", { className: "nav-item", children: (0,jsxRuntime/* jsx */.tZ)(A, { className: "nav-link active", href: "/builds", children: I18N_BUILDS }, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)("li", { className: "nav-item", children: (0,jsxRuntime/* jsx */.tZ)(A, { className: "nav-link active", href: "#", children: I18N_ABOUT_SITE }, void 0) }, void 0)] }, void 0), (0,jsxRuntime/* jsx */.tZ)("ul", { className: "navbar-nav mb-2 mb-md-0 float-md-end", children: (0,jsxRuntime/* jsxs */.BX)("li", { className: "nav-item dropdown", children: [(0,jsxRuntime/* jsxs */.BX)("a", { className: `nav-link dropdown-toggle ${isExpanded ? 'show' : ''}`, id: "navbarDropdown", role: "button", onClick: openDd, children: [(0,jsxRuntime/* jsx */.tZ)(GlobeIcon, {}, void 0), VARIATION_SELECTOR, " ", I18N_LANG_NAME] }, void 0), (0,jsxRuntime/* jsx */.tZ)("ul", { className: `dropdown-menu ${isExpanded ? 'show' : ''}`, style: 'right: 0', ref: ddRef, children: isExpanded &&
                                ["en","ru"].map(lang => {
                                    const langName = I18N_LANG_NAMES[lang];
                                    const isActiveLang = langName === I18N_LANG_NAME;
                                    return ((0,jsxRuntime/* jsx */.tZ)("li", { children: (0,jsxRuntime/* jsx */.tZ)("a", { className: `dropdown-item ${isActiveLang ? 'active' : ''}`, href: makeLocationHrefForLang(lang), children: I18N_LANG_NAMES[lang] }, void 0) }, lang));
                                }) }, void 0)] }, void 0) }, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/containers/header.tsx




function Header() {
    const [isNavExpanded, setIsNavExpanded] = (0,hooks/* useState */.eJ)(false);
    // TODO клик мимо компонента
    return ((0,jsxRuntime/* jsx */.tZ)("header", { children: (0,jsxRuntime/* jsx */.tZ)("div", { className: "navbar navbar-expand-md navbar-dark bg-primary", children: (0,jsxRuntime/* jsxs */.BX)("div", { className: "container", children: [(0,jsxRuntime/* jsx */.tZ)(A, { className: "navbar-brand", href: "/", children: "Genshin Base" }, void 0), (0,jsxRuntime/* jsx */.tZ)("button", { className: "navbar-toggler", type: "button", onClick: () => setIsNavExpanded(!isNavExpanded), children: (0,jsxRuntime/* jsx */.tZ)("span", { className: "navbar-toggler-icon" }, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)(Nav, { isNavExpanded: isNavExpanded }, void 0)] }, void 0) }, void 0) }, void 0));
}

;// CONCATENATED MODULE: ./lib/utils/date.js
/**
 * Конвертирует номер дня недели из вс-пн…-сб в пн-вт…-вс
 * @param {number} weekday
 * @returns {number}
 */
function weekdayAsMonSun(weekday) {
	return weekday === 0 ? 6 : weekday - 1
}

/**
 * @param {Date} date
 * @returns {number}
 */
function setDayStartUTC(date) {
	return date.setUTCHours(0, 0, 0, 0)
}

;// CONCATENATED MODULE: ./lib/genshin.js


/** @typedef {'pyro' | 'electro' | 'hydro' | 'dendro' | 'cryo' | 'anemo' | 'geo'} GI_ElementCode */
/** @typedef {'claymore' | 'sword' | 'catalyst' | 'polearm' | 'bow'} GI_WeaponTypeCode */
/** @typedef {'flower' | 'plume' | 'sands' | 'goblet' | 'circlet'} GI_ArtifactTypeCode */
/** @typedef {1 | 2 | 3 | 4 | 5} GI_RarityCode */
/**
 * @typedef {'wishes'|'event-wishes'|'events'|'battle-pass'|'in-game-shop'|
 *   'forging'|'fishing'|'npc-shop'|'chests'|'quests'|'puzzles'|'investigation'|
 *   'adventure-rank-10'|'playstation'} GI_WeaponObtainSource
 */
/** @typedef {'limited'|'unlimited'} GI_DomainTypeCode */

/** @typedef {{mapCode:MapCode, x:number, y:number}} MapLocation */

/** @typedef {'teyvat'|'enkanomiya'} MapCode */
/** @type {MapCode[]} */
const GI_MAP_CODES = ['teyvat', 'enkanomiya']

/** @typedef {'mondstadt'|'liyue'|'inazuma'} GI_RegionCode */
/** @type {GI_RegionCode[]} */
const GI_REGION_CODES = (/* unused pure expression or super */ null && (['mondstadt', 'liyue', 'inazuma']))

/** @typedef {'europe'|'asia'|'north-america'} GI_ServerRegionCode */
/** @type {GI_ServerRegionCode[]} */
const GI_SERVER_REGIONS = (/* unused pure expression or super */ null && (['europe', 'asia', 'north-america']))

/** @typedef {'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun'} WeekdayCode */
/** @type {WeekdayCode[]} */
const GI_ROTATION_WEEKDAY_CODES = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

/** @type {GI_ElementCode[]} */
const GI_ELEMENT_CODES = (/* unused pure expression or super */ null && (['pyro', 'electro', 'hydro', 'dendro', 'cryo', 'anemo', 'geo']))

/** @type {GI_WeaponTypeCode[]} */
const GI_WEAPON_TYPE_CODES = (/* unused pure expression or super */ null && (['claymore', 'sword', 'catalyst', 'polearm', 'bow']))

/** @type {GI_ArtifactTypeCode[]} */
const GI_ARTIFACT_TYPE_CODES = (/* unused pure expression or super */ null && (['flower', 'plume', 'sands', 'goblet', 'circlet']))

const ART_GROUP_18_ATK_CODE = '18%-atk'
const ART_GROUP_18_ATK_INSIDE_CODES = ['noblesse-oblige', 'wanderers-troupe'] //todo
const ART_GROUP_20_ER_CODE = '20%-er'
const ART_GROUP_20_ER_INSIDE_CODES = ['thundering-fury', 'crimson-witch-of-flames'] //todo
/** @type {Record<string, {name:string, rarity:GI_RarityCode}>} */
const ART_GROUP_DETAILS = {
	[ART_GROUP_18_ATK_CODE]: { name: '18% atk', rarity: 5 },
	[ART_GROUP_20_ER_CODE]: { name: '20% er', rarity: 5 },
}

/** @type {GI_RarityCode[]} */
const GI_RARITY_CODES = (/* unused pure expression or super */ null && ([1, 2, 3, 4, 5]))

/** Обычные коды, используются как есть */
const _GI_STAT_REGULAR = /**@type {const}*/ (['em'])
/** Используется как в обычном виде, так и с процентами: <stat> и <stat>% */
const _GI_STAT_PERCENT = /**@type {const}*/ (['def', 'dmg', 'atk', 'hp', 'er', 'healing'])
/** Используются с префиксом 'crit-' */
const _GI_STAT_CRIT_SUFFIXES = /**@type {const}*/ (['rate', 'dmg', 'rate%', 'dmg%'])
/** Используются с суффиксами '-dmg' и '-dmg%' */
const _GI_STAT_DMG_PEFIXES = /**@type {const}*/ (['phys', 'cryo', 'geo', 'anemo', 'hydro', 'electro', 'pyro'])

/**
 * @typedef {typeof _GI_STAT_REGULAR[number]
 *   | typeof _GI_STAT_PERCENT[number]
 *   | `${typeof _GI_STAT_PERCENT[number]}%`
 *   | `crit-${typeof _GI_STAT_CRIT_SUFFIXES[number]}`
 *   | `${typeof _GI_STAT_DMG_PEFIXES[number]}-dmg`
 *   | `${typeof _GI_STAT_DMG_PEFIXES[number]}-dmg%`} GI_KnownStatBonusCode
 */

const GI_KNOWN_STAT_BONUS_CODES = /**@type {GI_KnownStatBonusCode[]}*/ (
	/**@type {readonly string[]}*/ (_GI_STAT_REGULAR)
		.concat(_GI_STAT_PERCENT)
		.concat(_GI_STAT_PERCENT.map(x => x + '%'))
		.concat(_GI_STAT_CRIT_SUFFIXES.map(x => 'crit-' + x))
		.concat(_GI_STAT_DMG_PEFIXES.map(x => x + '-dmg'))
		.concat(_GI_STAT_DMG_PEFIXES.map(x => x + '-dmg%'))
)

/**
 * Сдвиг таймзоны региона относительно UTC (в часах)
 * @type {Record<GI_ServerRegionCode, number>}
 */
const GI_REGION_TIMEZONE_OFFSET = {
	europe: 1,
	asia: 8,
	'north-america': -5,
}
/** Время перезапуска сервера (в часах) относительно полуночи по локальному времени региона */
const GI_SERVER_RESET_TIME = 4
/**
 * @param {GI_ServerRegionCode} regionCode
 * @returns {{weekdayCode:WeekdayCode, weekdayMonSun:number, resetIn:number, resetAt:Date}}
 */
function getRegionTime(regionCode) {
	const now = new Date()
	// время до перезапуска сервера относительно конца дня по UTC
	const offsetHours = GI_SERVER_RESET_TIME - GI_REGION_TIMEZONE_OFFSET[regionCode]

	const lastResetDate = new Date(now)
	lastResetDate.setHours(lastResetDate.getHours() - offsetHours)
	const weekdayMonSun = weekdayAsMonSun(lastResetDate.getUTCDay())
	setDayStartUTC(lastResetDate)
	lastResetDate.setUTCHours(offsetHours)

	const nextResetDate = new Date(lastResetDate)
	nextResetDate.setDate(nextResetDate.getDate() + 1)

	return {
		weekdayMonSun: weekdayMonSun,
		weekdayCode: GI_ROTATION_WEEKDAY_CODES[weekdayMonSun],
		resetIn: +nextResetDate - +now,
		resetAt: nextResetDate,
	}
}
/**
 * {@link https://www.timeanddate.com/time/map/}
 * @returns {GI_ServerRegionCode}
 */
function guessCurrentRegion() {
	if (navigator.language.startsWith('ru')) return 'europe'
	const curOffset = -new Date().getTimezoneOffset() / 60
	if (curOffset <= -2) return 'north-america'
	if (curOffset >= 5) return 'asia'
	return 'europe'
}

/** @param {string} name */
function getCharacterCodeFromName(name) {
	const code = name.trim().toLocaleLowerCase().replace(/\s/g, '-')
	if (code === 'childe') return 'tartaglia'
	if (code === 'kamisato-ayaka') return 'ayaka'
	if (code === 'sangonomiya-kokomi') return 'kokomi'
	if (code === 'kaedehara-kazuha') return 'kazuha'
	if (code === 'arataki-itto') return 'itto'
	return code
}

/** @param {string} name */
function getArtifactCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s/g, '-').replace(/'/g, '')
}

/** @param {string} name */
function getWeaponCodeFromName(name) {
	return name
		.trim()
		.toLocaleLowerCase()
		.replace(/\s+/g, '-')
		.replace(/['"«»]/g, '')
}

/** @param {string} name */
function getDomainCodeFromName(name) {
	return name
		.trim()
		.toLocaleLowerCase()
		.replace(/[\s:]+/g, '-')
		.replace(/'/g, '')
}

/** @param {string} name */
function getItemCodeFromName(name) {
	return name.trim().toLocaleLowerCase().replace(/\s+/g, '-').replace(/'/g, '')
}

/** @param {string} name */
function getEnemyCodeFromName(name) {
	return name
		.trim()
		.toLocaleLowerCase()
		.replace(/[\s:\-,]+/g, '-')
		.replace(/'/g, '')
}

/**
 * @template {{rarity:GI_RarityCode}} T
 * @param {T[]} items
 * @returns {T}
 */
function getWithMaxRarity(items) {
	let maxItem = items[0]
	for (let i = 0; i < items.length; i++) if (maxItem.rarity < items[i].rarity) maxItem = items[i]
	return maxItem
}

/** @type {Record<MapCode, string>} */
const locEnc_map2code = {
	teyvat: 'T',
	enkanomiya: 'E',
}
/** @type {Record<string, MapCode>} */
const locEnc_code2map = {
	T: 'teyvat',
	E: 'enkanomiya',
}
/**
 * @param {MapLocation[]} locations
 * @param {number} [downsample]
 * @returns {string}
 */
function encodeLocations(locations, downsample = 1) {
	if (downsample < 1 || downsample > 35 || downsample % 1 !== 0)
		throw new Error(`wrong downsample: ${downsample}`)

	const sortedLocs = locations.slice().sort((a, b) => a.x - b.x || a.y - b.y)

	let res = downsample.toString(36)
	for (const [groupMapCode, groupLetter] of Object.entries(locEnc_map2code)) {
		let xx = ''
		let yy = ''
		for (const { mapCode, x, y } of sortedLocs) {
			if (mapCode === groupMapCode) {
				xx += encodeLocNum(x, downsample)
				yy += encodeLocNum(y, downsample)
			}
		}
		if (xx || yy) res += xx + yy + groupLetter
	}
	return res
}
/**
 * @param {MapLocation[]} locations
 * @param {number} [downsample]
 * @returns {string}
 */
function encodeLocationsChecked(locations, downsample = 1) {
	const res = encodeLocations(locations, downsample)

	const codes = Object.keys(locEnc_map2code)
	const sortedLocs = locations
		.slice()
		.sort((a, b) => codes.indexOf(a.mapCode) - codes.indexOf(b.mapCode) || a.x - b.x || a.y - b.y)
		.map(l => ({
			...l,
			x: Math.round(l.x / downsample) * downsample,
			y: Math.round(l.y / downsample) * downsample,
		}))
	const decodedLocs = decodeLocations(res)
	const inJson = JSON.stringify(sortedLocs)
	const outJson = JSON.stringify(decodedLocs)
	if (inJson !== outJson)
		throw new Error('wrong decoded locations:\n> ' + inJson + '\n> ' + outJson + '\n> ' + res)

	return res
}
/**
 * @param {string} encodedLocations
 * @returns {MapLocation[]}
 */
function decodeLocations(encodedLocations) {
	const downsample = parseInt(encodedLocations[0], 36)
	encodedLocations = encodedLocations.slice(1)

	const locs = /**@type {MapLocation[]}*/ ([])
	while (encodedLocations) {
		let i = 0
		for (; i < encodedLocations.length; i++) {
			const mapCode = locEnc_code2map[encodedLocations[i]]
			if (mapCode) {
				const len3 = (i / 2) | 0
				for (let j = 0; j < len3; j += 3) {
					const x = decodeLocNum(encodedLocations, j, downsample)
					const y = decodeLocNum(encodedLocations, j + len3, downsample)
					locs.push({ mapCode, x, y })
				}
				break
			}
		}
		encodedLocations = encodedLocations.slice(i + 1)
	}
	return locs
}
const LOC_NUM_ENC_OFFSET = 18 * 36 * 36
/**
 * @param {number} num
 * @param {number} downsample
 */
function encodeLocNum(num, downsample) {
	const numD = Math.round(num / downsample)
	if (numD < -LOC_NUM_ENC_OFFSET || numD >= LOC_NUM_ENC_OFFSET)
		throw new Error(`location value out of range: ${num} (${numD})`)
	const str = (LOC_NUM_ENC_OFFSET + numD).toString(36)
	return '0'.repeat(3 - str.length) + str
}
/**
 * @param {string} str
 * @param {number} i
 * @param {number} downsample
 */
function decodeLocNum(str, i, downsample) {
	return (parseInt(str.slice(i, i + 3), 36) - LOC_NUM_ENC_OFFSET) * downsample
}

;// CONCATENATED MODULE: ./www/src/api/utils.ts
function apiGetJSONFile(path, signal) {
    if (true) {
        return JSON.parse(global._SSR_READ_PUBLIC(path));
    }
    else {}
}
function utils_mapAllByCode(obj) {
    // @ts-ignore
    const maps = {};
    for (const attr in obj) {
        const val = obj[attr];
        if (Array.isArray(val) && (val.length === 0 || 'code' in val[0])) {
            // @ts-ignore
            maps[attr] = new Map(val.map(x => [x.code, x]));
        }
    }
    return Object.assign({}, obj, { maps });
}
function getAllRelated(map, codes) {
    const res = [];
    for (const code of codes) {
        const item = map.get(code);
        if (item !== undefined)
            res.push(item);
    }
    return res;
}
/*
type MergeNestedInner<TBase, T> = T & {
    [K in keyof T as K extends 'materialCodes'
        ? 'materials'
        : K extends 'domainCodes'
        ? 'domains'
        : K extends 'enemyCodes'
        ? 'enemies'
        : K]: K extends 'materialCodes'
        ? TBase extends { items: (infer TItem)[] }
            ? TItem[]
            : never
        : K extends 'domainCodes'
        ? TBase extends { domains: (infer TDomain)[] }
            ? TDomain[]
            : never
        : K extends 'enemyCodes'
        ? TBase extends { enemies: (infer TEnemy)[] }
            ? TEnemy[]
            : never
        : MergeNestedInner<TBase, T[K]>
}

type WithNested_<T, TArt, TItem, TDomain, TEnemy> = T & {
    [K in keyof T as K extends 'materialCodes'
        ? 'materials'
        : K extends 'domainCodes'
        ? 'domains'
        : K extends 'enemyCodes'
        ? 'enemies'
        : K]: K extends 'materialCodes'
        ? TItem
        : K extends 'domainCodes'
        ? TDomain
        : K extends 'enemyCodes'
        ? TEnemy
        : WithNested_<T[K], TItem, TDomain, TEnemy>
}

type WithNestedAuto<T> = WithNested_<
    T,
    T extends { items: (infer TItem)[] } ? TItem[] : never,
    T extends { artifacts: (infer TArt)[] } ? TArt[] : never,
    T extends { domains: (infer TDomain)[] } ? TDomain[] : never,
    T extends { enemies: (infer TEnemy)[] } ? TEnemy[] : never
>

export type WithNested<T> = MergeNestedInner<T, T>

export function addNested<T>(obj: T): WithNested<T> {
    const mapsCache = {}
    function getAllByCode(codes, attr) {
        if (!(attr in obj)) throw new Error(`no attr '${attr}' in obj`)
        const map = (mapsCache[attr] = mapsCache[attr] ?? new Map(obj[attr].map(x => [x.code, x])))
        const res: unknown[] = []
        for (const code of codes) {
            const item = map.get(code)
            if (item) res.push(item)
        }
        return res
    }

    const relatedAttrMap = {
        materialCodes: ['materials', 'items'],
        domainCodes: ['domains', 'domains'],
        enemyCodes: ['enemies', 'enemies'],
    }
    function mergeInner(cur) {
        if (cur === null || typeof cur !== 'object') return cur

        for (const attr in cur) {
            mergeInner(cur[attr])
            const rel = relatedAttrMap[attr]
            if (rel) cur[rel[0]] = getAllByCode(cur[attr], rel[1])
        }
    }

    mergeInner(obj)
    return obj as WithNested<T>
}
*/
/*
type ItemsWithCodeAttrs<T> = {
    [K in keyof T]: T[K] extends (infer A)[] ? (A extends { code: string } ? K : never) : never
}[keyof T]

export function mapByCode<T, K extends ItemsWithCodeAttrs<T>>(obj: T, attrs: K[]): MapByCode<T, K> {
    // @ts-ignore
    const maps: MapByCode<T, K>['maps'] = {}
    for (const attr of attrs) {
        // @ts-ignore
        maps[attr] = new Map(obj[attr].map(x => [x.code, x]))
    }
    return Object.assign({}, obj, { maps })
}
*/

;// CONCATENATED MODULE: ./www/src/api/endpoints.ts



const get = (prefix, signal) => apiGetJSONFile(`generated/${prefix}.json?v=${GENERATED_DATA_HASH}`, signal);
const getLang = (prefix, signal) => get(prefix + '-' + global._SSR_LANG, signal);
const _map = (val, func) => (0,values/* isPromise */.tI)(val) ? val.then(func) : func(val);
function apiGetCharacter(code, signal) {
    return _map(getLang(`characters/${code}`, signal), utils_mapAllByCode);
}
function apiGetCharacterRelatedLocs(code, signal) {
    return getLang(`characters/${code}-locs`, signal);
}
function apiGetArtifacts(signal) {
    return _map(getLang(`artifacts`, signal), mapAllByCode);
}
function apiGetWeapons(signal) {
    return _map(getLang(`weapons`, signal), mapAllByCode);
}
function apiMaterialsTimetable(signal) {
    return _map(getLang(`timetables/materials`, signal), utils_mapAllByCode);
}
function apiGetChangelogs(onlyRecent, signal) {
    return get(`changelogs${onlyRecent ? '-recent' : ''}`, signal);
}

;// CONCATENATED MODULE: ./www/src/api/index.ts






function useBuildWithDelayedLocs(characterCode) {
    const [build, isUpdating] = useFetchWithPrev(sig => apiGetCharacter(characterCode, sig), [characterCode]);
    const buildIsLoaded = isLoaded(build);
    const locs = useFetch(sig => buildIsLoaded
        ? apiGetCharacterRelatedLocs(characterCode, sig) //
        : (0,values/* promiseNever */.WN)(), //не загружаем локации, пока не загрузится до конца билд
    [characterCode, buildIsLoaded]);
    const buildWithLocs = (0,hooks/* useMemo */.Ye)(() => (buildIsLoaded && isLoaded(locs) ? applyFullInfoLocationsImmut(build, locs) : build), [build, buildIsLoaded, locs]);
    return [buildWithLocs, isUpdating];
}
function applyFullInfoLocationsImmut(fullInfo, locsInfo) {
    const items = applyItemsLocationsImmut(fullInfo.items, locsInfo.items);
    const enemies = applyItemsLocationsImmut(fullInfo.enemies, locsInfo.enemies);
    return utils_mapAllByCode({ ...fullInfo, items, enemies });
}
function applyItemsLocationsImmut(items, locItems) {
    let resItems = items;
    for (let i = 0; i < items.length; i++) {
        const locs = locItems[items[i].code];
        if (locs) {
            if (resItems === items)
                resItems = items.slice();
            resItems[i] = { ...items[i], locations: decodeLocations(locs) };
        }
    }
    return resItems;
}

;// CONCATENATED MODULE: ./www/src/components/spinners.tsx

function Spinner() {
    return ((0,jsxRuntime/* jsx */.tZ)("div", { class: "d-flex justify-content-center", children: (0,jsxRuntime/* jsx */.tZ)("div", { class: "spinner-border", role: "status", children: (0,jsxRuntime/* jsx */.tZ)("span", { class: "visually-hidden", children: "Loading..." }, void 0) }, void 0) }, void 0));
}
function CentredSpinner() {
    return ((0,jsxRuntime/* jsx */.tZ)("div", { className: "position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center", children: (0,jsxRuntime/* jsx */.tZ)(Spinner, {}, void 0) }, void 0));
}

;// CONCATENATED MODULE: ./www/src/media/circlet.png
/* harmony default export */ const circlet = (__webpack_require__.p + "circlet.a7d84b1e.png");
;// CONCATENATED MODULE: ./www/src/media/flower.png
/* harmony default export */ const flower = (__webpack_require__.p + "flower.695510cb.png");
;// CONCATENATED MODULE: ./www/src/media/goblet.png
/* harmony default export */ const goblet = (__webpack_require__.p + "goblet.06e92e38.png");
;// CONCATENATED MODULE: ./www/src/media/plume.png
/* harmony default export */ const plume = (__webpack_require__.p + "plume.6851630b.png");
;// CONCATENATED MODULE: ./www/src/media/sands.png
/* harmony default export */ const sands = (__webpack_require__.p + "sands.e69477c6.png");
;// CONCATENATED MODULE: ./www/src/utils/artifacts.tsx






const artifactTypes = [
    { code: 'flower', imgSrc: flower },
    { code: 'plume', imgSrc: plume },
    { code: 'sands', imgSrc: sands },
    { code: 'goblet', imgSrc: goblet },
    { code: 'circlet', imgSrc: circlet },
];
function getArtifactTypeIconSrc(artifactTypeCode) {
    return (artifactTypes.find(at => at.code === artifactTypeCode) || artifactTypes[0]).imgSrc;
}
function isGroup(code) {
    return code === ART_GROUP_18_ATK_CODE || code === ART_GROUP_20_ER_CODE;
}
function getArtifactIconSrc(artifactCode) {
    return isGroup(artifactCode) ? flower : "/" + `media/artifacts/${artifactCode}.png`;
}
function getArtifactIconLargeSrc(artifactCode) {
    return isGroup(artifactCode)
        ? flower
        : "/" + `media/artifacts/${artifactCode}.large.png`;
}
function getAllOrNone(codes, map) {
    const res = [];
    for (const code of codes) {
        const item = map.get(code);
        if (!item)
            return [];
        res.push(item);
    }
    return res;
}
function getAllArtifacts(code, artsMap) {
    if (code === ART_GROUP_18_ATK_CODE)
        return getAllOrNone(ART_GROUP_18_ATK_INSIDE_CODES, artsMap);
    if (code === ART_GROUP_20_ER_CODE)
        return getAllOrNone(ART_GROUP_20_ER_INSIDE_CODES, artsMap);
    return getAllOrNone([code], artsMap);
}

;// CONCATENATED MODULE: ./www/src/components/block-header.tsx

function BlockHeader({ children, classes = '' }) {
    return (0,jsxRuntime/* jsx */.tZ)("h6", { className: `text-uppercase opacity-75 letter-spacing-1 ${classes}`, children: children }, void 0);
}

;// CONCATENATED MODULE: ./www/src/components/select.tsx


function SimpleSelect({ options, selectedOption, onOptionSelect, classes = '', size = 1, }) {
    const handleChange = (0,hooks/* useCallback */.I4)(e => {
        onOptionSelect(options.find(o => o.code === e.target.value));
    }, [options, onOptionSelect]);
    return ((0,jsxRuntime/* jsxs */.BX)("select", { className: `form-select border-secondary bg-dark text-light c-pointer ${classes}`, onChange: handleChange, size: size, children: [(0,jsxRuntime/* jsx */.tZ)("option", { value: "", disabled: true, selected: true, hidden: true, children: "Select\u2026" }, void 0), options.map(o => ((0,jsxRuntime/* jsx */.tZ)("option", { className: "c-pointer", value: o.code, selected: !!(selectedOption && o.code === selectedOption.code), children: o.title }, o.code)))] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/components/tabs.tsx



function tabTitleFromName(obj) {
    return obj.name;
}
function Tabs({ tabs, titleFunc, selectedTab, onTabSelect, classes = '', }) {
    return ((0,jsxRuntime/* jsx */.tZ)("ul", { className: `nav nav-tabs ${classes}`, children: tabs.map(t => ((0,jsxRuntime/* jsx */.tZ)("li", { className: "nav-item", children: (0,jsxRuntime/* jsx */.tZ)("a", { className: `nav-link ${t.code === selectedTab.code ? 'active' : ''}`, href: "#", onClick: e => {
                    e.preventDefault();
                    onTabSelect(t);
                }, children: titleFunc ? titleFunc(t) : 'title' in t ? t.title : t.code }, void 0) }, t.code))) }, void 0));
}
function BtnTabGroup({ tabs, titleFunc, selectedTab, onTabSelect, classes = '', }) {
    return ((0,jsxRuntime/* jsx */.tZ)("div", { class: `btn-group ${classes}`, children: tabs.map(t => ((0,jsxRuntime/* jsx */.tZ)("button", { type: "button", disabled: tabs.length === 1, className: `btn btn-sm lh-sm ${t.code === selectedTab.code ? 'btn-primary' : 'btn-outline-primary'} `, onClick: e => {
                onTabSelect(t);
            }, children: titleFunc ? titleFunc(t) : 'title' in t ? t.title : t.code }, t.code))) }, void 0));
}
/**
 * а) сохраняет выделенную вкладку по коду (после смены вкладок, если выбранного ранее кода
 *    среди новых вкладок нет, возвращает первую вкладку).
 * б) если передан массив args, сохраняет выбранную вкладку для каждого уникального набора args
 *    (полезно, если эти вкладки находятся врутри другого переключателя,
 *    например вкладки ролей, а над ними - переключатель персонажей).
 */
function useSelectable(tabs, args) {
    const [tabCodes, setTabCodes] = (0,hooks/* useState */.eJ)([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const argsInner = (0,hooks/* useMemo */.Ye)(() => args ?? [], args);
    const item = (0,hooks/* useMemo */.Ye)(() => tabCodes.find(x => arrShallowEqual(argsInner, x.args)), [argsInner, tabCodes]);
    const tab = (0,hooks/* useMemo */.Ye)(() => (item && tabs.find(x => x.code === item.code)) ?? tabs[0], [tabs, item]);
    const setTab = (0,hooks/* useCallback */.I4)((tab) => {
        if (item) {
            if (item.code !== tab.code) {
                setTabCodes(tabCodes.filter(x => x !== item).concat({ ...item, code: tab.code }));
            }
        }
        else {
            setTabCodes(tabCodes.concat({ code: tab.code, args: argsInner }));
        }
    }, [argsInner, item, tabCodes]);
    return [tab, setTab];
}

;// CONCATENATED MODULE: ./www/src/utils/calc-pos-for-dd.tsx
// bootstrap edition
function calcPosForDd(parentRect, ddRect, { isAbsolute = false, isCentered = false, shouldFitInScreen = false } = {}) {
    const tWidth = window.innerWidth;
    const tHeight = window.innerHeight;
    const scrollTopFix = isAbsolute ? window.scrollY : 0;
    const centredFix = isCentered ? (parentRect.width - ddRect.width) / 2 : 0;
    let top = 0;
    let left = 0;
    let layoutPositionX = 'end';
    let layoutPositionY = 'bottom';
    if (parentRect.top + parentRect.height + ddRect.height < tHeight) {
        // to bottom
        top = parentRect.top + parentRect.height + scrollTopFix;
        layoutPositionY = 'bottom';
    }
    else {
        // to top
        top = parentRect.top - ddRect.height + scrollTopFix;
        layoutPositionY = 'top';
    }
    if (parentRect.left + ddRect.width + centredFix < tWidth) {
        // to right
        left = parentRect.left + centredFix;
        layoutPositionX = 'end';
    }
    else {
        // to left
        left = parentRect.left + parentRect.width - ddRect.width - centredFix;
        layoutPositionX = 'start';
    }
    if (shouldFitInScreen) {
        left = Math.min(Math.max(0, left), tWidth - ddRect.width);
        top = Math.max(top, 0);
    }
    return { top, left, layoutPosition: { y: layoutPositionY, x: layoutPositionX } };
}

// EXTERNAL MODULE: ./www/src/utils/preact-compat.tsx + 3 modules
var preact_compat = __webpack_require__(49);
;// CONCATENATED MODULE: ./www/src/containers/item-cards/item-detail-dd-portal.tsx





let modalsEl = null;
const ItemDetailDdPortal = ({ onClickAway, children, classes = '', targetEl, contentKey = null, }) => {
    modalsEl ??= document.querySelector('.modals');
    const wrapRef = (0,hooks/* useRef */.sO)(null);
    const defClassName = `popover item-detail-popover ${classes}`;
    const [arrowStyle, setArrowStyle] = (0,hooks/* useState */.eJ)('');
    const onResize = (0,hooks/* useCallback */.I4)(() => {
        if (!wrapRef.current)
            return;
        if (!targetEl)
            return;
        const wrapEl = wrapRef.current;
        const pos = calcPosForDd(targetEl.getBoundingClientRect(), wrapEl.getBoundingClientRect(), {
            isAbsolute: true,
            isCentered: true,
            shouldFitInScreen: true,
        });
        ('bs-popover-top bs-popover-bottom');
        wrapEl.className = `${defClassName} bs-popover-${pos.layoutPosition.y}`;
        wrapEl.style.left = `${pos.left}px`;
        wrapEl.style.top = `${pos.top}px`;
        setArrowStyle(`position: absolute; transform: translate3d(${wrapEl.offsetWidth / 2 - 8}px, 0, 0); left: 0`);
    }, [wrapRef, targetEl, defClassName, setArrowStyle]);
    (0,hooks/* useLayoutEffect */.bt)(onResize);
    useWindowSize();
    useClickAway(wrapRef, onClickAway);
    //todo обновлять позицию, когда загрузилась картинка
    return (0,preact_compat/* createPortal */.j)((0,jsxRuntime/* jsxs */.BX)("div", { class: defClassName, ref: wrapRef, children: [children, (0,jsxRuntime/* jsx */.tZ)("div", { class: "popover-arrow", style: arrowStyle }, void 0)] }, void 0), modalsEl);
};
const ItemDetailDdMobilePortal = ({ onClickAway, children, classes = '', contentKey = null, }) => {
    modalsEl ??= document.querySelector('.modals');
    const wrapRef = (0,hooks/* useRef */.sO)(null);
    const defClassName = `fixed-bottom ${classes}`;
    useClickAway(wrapRef, onClickAway);
    return (0,preact_compat/* createPortal */.j)((0,jsxRuntime/* jsx */.tZ)("div", { class: defClassName, ref: wrapRef, children: children }, void 0), modalsEl);
};

;// CONCATENATED MODULE: ./www/src/components/tooltip.tsx





let tooltip_modalsEl = null;
function tooltip_Tooltip({ children, classes = '', targetEl, }) {
    tooltip_modalsEl ??= document.querySelector('.modals');
    const wrapRef = (0,hooks/* useRef */.sO)(null);
    const defClassName = `tooltip fade show ${classes}`;
    const [arrowStyle, setArrowStyle] = (0,hooks/* useState */.eJ)('');
    const onResize = (0,hooks/* useCallback */.I4)(() => {
        if (!wrapRef.current)
            return;
        if (!targetEl)
            return;
        const wrapEl = wrapRef.current;
        const pos = calcPosForDd(targetEl.getBoundingClientRect(), wrapEl.getBoundingClientRect(), {
            isAbsolute: true,
            isCentered: true,
        });
        ('bs-tooltip-top bs-tooltip-bottom');
        wrapEl.className = `${defClassName} bs-tooltip-${pos.layoutPosition.y}`;
        wrapEl.style.left = `${Math.max(0, pos.left)}px`;
        wrapEl.style.top = `${Math.max(0, pos.top)}px`;
        setArrowStyle(`position: absolute; transform: translate3d(${wrapEl.offsetWidth / 2 - 8}px, 0, 0); left: 0`);
    }, [wrapRef, targetEl, defClassName, setArrowStyle]);
    (0,hooks/* useLayoutEffect */.bt)(onResize);
    useWindowSize();
    //todo обновлять позицию, когда загрузилась картинка
    return (0,preact_compat/* createPortal */.j)((0,jsxRuntime/* jsxs */.BX)("div", { className: defClassName, ref: wrapRef, children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "tooltip-arrow", style: arrowStyle }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "tooltip-inner", children: children }, void 0)] }, void 0), tooltip_modalsEl);
}

;// CONCATENATED MODULE: ./www/src/utils/local-storage-keys.tsx

const SK_SELECTED_REGION_CODE = 'selected-region-code';
const SK_DEFAULT_SELECTED_REGION_CODE = guessCurrentRegion();
//sk - storage key
const SK_FAV_CHAR_CODES = 'favoriteCharacterCodes';
const SK_FAV_TALENT_MATERIAL_CODES = 'favoriteTalentMaterialCodes';
const local_storage_keys_SK_FAV_WEAPON_DATAS = 'favoriteWeaponDatas';
const SK_FAV_WEAPON_PRIMARY_MATERIAL_CODES = 'favoriteWeaponPrimaryMaterialCodes';

;// CONCATENATED MODULE: ./www/src/modules/builds/common.tsx












const DUMMY_ROLE = {
    title: '…',
    code: '',
};
const DUMMY_ROLES = [DUMMY_ROLE];
function makeRoleTitle(r) {
    return ((0,jsxRuntime/* jsxs */.BX)("span", { children: [r.isRecommended && ((0,jsxRuntime/* jsx */.tZ)("span", { className: "fs-4 lh-1 opacity-75 text-warning align-bottom", children: STAR }, void 0)), r.code] }, r.code));
}
const CIRCLET_GOBLET_SANDS = ['sands', 'goblet', 'circlet'];
function getRoleData(build, selectedCode) {
    return (0,values/* mustBeDefined */.A$)(build.character.roles.find(x => x.code === selectedCode));
}
function genArtMainStatDetail(role, itemCode, isShort) {
    return ((0,jsxRuntime/* jsxs */.BX)("span", { className: "", children: [genSimpleList(role.mainStats[itemCode].codes.map(I18N_STAT_NAME)), isShort
                ? ' ' + genNotes(role.mainStats[itemCode]) + genSeeCharNotes(role.mainStats[itemCode])
                : null] }, void 0));
}
function genSimpleList(arr) {
    return arr.join(', ');
}
function notesWrap(str) {
    return (0,jsxRuntime/* jsx */.tZ)("div", { className: "text-muted small", children: str }, void 0);
}
function genNotes(item) {
    return item.notes === null ? '' : notesWrap(JSON.stringify(item.notes));
}
function genSeeCharNotes(item) {
    return ''; //TODO
    return item.seeCharNotes ? notesWrap(' (see notes)') : '';
}
function notesToJSX(tips) {
    function processString(str) {
        return str
            .split('\n')
            .map((sub, i, arr) => [sub, i < arr.length - 1 ? (0,jsxRuntime/* jsx */.tZ)("br", {}, void 0) : ''])
            .flat()
            .filter(a => a);
    }
    function processObj(tip) {
        if (typeof tip === 'string')
            return processString(tip);
        if ('p' in tip)
            return (0,jsxRuntime/* jsx */.tZ)("p", { children: notesToJSX(tip.p) }, void 0);
        if ('b' in tip)
            return (0,jsxRuntime/* jsx */.tZ)("b", { class: "opacity-75 text-normal", children: notesToJSX(tip.b) }, void 0);
        if ('i' in tip)
            return (0,jsxRuntime/* jsx */.tZ)("i", { children: notesToJSX(tip.i) }, void 0);
        if ('u' in tip)
            return (0,jsxRuntime/* jsx */.tZ)("u", { children: notesToJSX(tip.u) }, void 0);
        if ('s' in tip)
            return (0,jsxRuntime/* jsx */.tZ)("s", { children: notesToJSX(tip.s) }, void 0);
        if ('a' in tip)
            return (0,jsxRuntime/* jsx */.tZ)("a", { href: tip.href, children: notesToJSX(tip.a) }, void 0);
        if ('weapon' in tip)
            return ((0,jsxRuntime/* jsx */.tZ)(ItemDetailsLabel, { type: "weapon", code: tip.code, children: notesToJSX(tip.weapon) }, void 0));
        if ('artifact' in tip)
            return ((0,jsxRuntime/* jsx */.tZ)(ItemDetailsLabel, { type: "artifact", code: tip.code, children: notesToJSX(tip.artifact) }, void 0));
        if ('item' in tip)
            return (0,jsxRuntime/* jsx */.tZ)(jsxRuntime/* Fragment */.HY, { children: notesToJSX(tip.item) }, void 0);
        (0,values/* warnUnlessNever */.iD)('unknown element type in notes: ', tip);
        return (0,jsxRuntime/* jsx */.tZ)("span", { children: JSON.stringify(tip) }, void 0);
    }
    if (!tips)
        return null;
    if (Array.isArray(tips))
        return tips.map(processObj).flat();
    return processObj(tips);
}
function genArtifactAdvice(set, build, isLast = true) {
    // todo notes
    if ('code' in set) {
        //ArtifactRef
        const artifactsForDd = getAllArtifacts(set.code, build.maps.artifacts);
        if (!artifactsForDd.length)
            return null;
        const artifactForList = ART_GROUP_DETAILS[set.code] ?? artifactsForDd[0];
        return ((0,jsxRuntime/* jsx */.tZ)(LabeledItemAvatar, { imgSrc: getArtifactIconSrc(set.code), rarity: artifactForList.rarity, title: artifactForList.name, avatarTopEndBadge: 'x' + set.count, avatarClasses: "with-padding", classes: `small ${isLast ? 'mb-1' : ''}`, ddComponent: (0,jsxRuntime/* jsx */.tZ)(ArtifactCard, { artifacts: artifactsForDd, related: build.maps, title: artifactForList.name }, void 0) }, set.code));
    }
    else {
        //ArtifactRefNode
        return ((0,jsxRuntime/* jsx */.tZ)(ItemsListGroupWrap, { children: set.arts.map((art, i) => {
                const isLastInList = i >= set.arts.length - 1;
                return ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [genArtifactAdvice(art, build, isLastInList), !isLastInList && (0,jsxRuntime/* jsx */.tZ)(ItemsJoinerWrap, { children: I18N_CONJUCTIONS[set.op] }, void 0)] }, void 0));
            }) }, void 0));
    }
}
function ItemsJoinerWrap({ children }) {
    return (0,jsxRuntime/* jsx */.tZ)("div", { className: "text-start text-muted small px-5 my-n1", children: children }, void 0);
}
function ItemsListGroupWrap({ children, }) {
    return (0,jsxRuntime/* jsx */.tZ)("div", { className: "border-2 rounded border-secondary border-start ps-2", children: children }, void 0);
}
const MAX_SMTHS_TO_STORE = 5;
function removeOldSmthsFromList(codes) {
    return codes.slice(0, MAX_SMTHS_TO_STORE);
}
function ToggleSmthFav({ smthCode, classes, storageKey, tipFav, tipNotFav, }) {
    const [favSmthCodes, setFavSmthCodes] = hooks_useLocalStorage(storageKey, []);
    const [elRef, isHovered] = hooks_useHover();
    const isFav = ~favSmthCodes.indexOf(smthCode);
    const toggleFav = (0,hooks/* useCallback */.I4)(() => {
        setFavSmthCodes(removeOldSmthsFromList(isFav ? favSmthCodes.filter(c => c !== smthCode) : [smthCode, ...favSmthCodes]));
    }, [smthCode, setFavSmthCodes, favSmthCodes, isFav]);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { role: "button", className: `user-select-none lh-1 ${isFav ? 'text-danger' : 'text-danger opacity-50'} ${classes}`, onClick: toggleFav, ref: elRef, children: [isFav ? typography_HEART : typography_HEART_EMPTY, elRef.current && isHovered ? ((0,jsxRuntime/* jsx */.tZ)(tooltip_Tooltip, { targetEl: elRef.current, children: isFav ? tipFav : tipNotFav }, void 0)) : null] }, void 0));
}
function ToggleCharFav({ characterCode, classes, }) {
    return ((0,jsxRuntime/* jsx */.tZ)(ToggleSmthFav, { smthCode: characterCode, classes: classes, storageKey: SK_FAV_CHAR_CODES, tipFav: 'Remove character from your favorites', tipNotFav: 'Add character to your favorites' }, void 0));
}
function ToggleWeaponPrimaryMaterialFav({ itemCode, classes, }) {
    return ((0,jsxRuntime/* jsx */.tZ)(ToggleSmthFav, { smthCode: itemCode, classes: classes, storageKey: SK_FAV_WEAPON_PRIMARY_MATERIAL_CODES, tipFav: 'Remove material from your favorites', tipNotFav: 'Add material to your favorites' }, void 0));
}
function ToggleTalentMaterialFav({ itemCode, classes, }) {
    return ((0,jsxRuntime/* jsx */.tZ)(ToggleSmthFav, { smthCode: itemCode, classes: classes, storageKey: SK_FAV_TALENT_MATERIAL_CODES, tipFav: 'Remove material from your favorites', tipNotFav: 'Add material to your favorites' }, void 0));
}
//not used
function ToggleWeaponFav({ weaponCode, weapMatCode, classes, }) {
    const [favWeaponDatas, setWeaponDatas] = useLocalStorage(SK_FAV_WEAPON_DATAS, []);
    const favWeaponCodes = useMemo(() => favWeaponDatas.map(wd => wd[0]), [favWeaponDatas]);
    const [elRef, isHovered] = useHover();
    const isFav = ~favWeaponCodes.indexOf(weaponCode);
    const toggleFav = useCallback(() => {
        setWeaponDatas(removeOldSmthsFromList(isFav
            ? favWeaponDatas.filter(d => d[0] !== weaponCode)
            : [[weaponCode, weapMatCode], ...favWeaponDatas]));
    }, [weaponCode, weapMatCode, setWeaponDatas, favWeaponDatas, isFav]);
    return (_jsxs("div", { role: "button", className: `user-select-none lh-1 ${isFav ? 'text-danger' : 'text-danger opacity-50'} ${classes}`, onClick: toggleFav, ref: elRef, children: [isFav ? HEART : HEART_EMPTY, elRef.current && isHovered ? (_jsx(Tooltip, { targetEl: elRef.current, children: isFav ? 'Remove weapon from your favorites' : 'Add weapon to your favorites' }, void 0)) : null] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/utils/characters.tsx
// export type Character = {
// 	code: string,
// 	element:
// }
// export function getCharactersWithElement = (characters, elementCode) = {
// 	return characters.filter(c=> c.element = elementCode)
// }
function unprefixTraveler(code) {
    return code.startsWith('traveler-') ? 'traveler' : code;
}
function getCharacterAvatarSrc(code) {
    return "/" + `media/characters/avatars/${unprefixTraveler(code)}.png`;
}
function getCharacterAvatarLargeSrc(code) {
    return "/" + `media/characters/avatars/${unprefixTraveler(code)}.large.png`;
}
function getCharacterPortraitSrc(code) {
    return "/" + `media/characters/portraits/${unprefixTraveler(code)}.png`;
}
function getCharacterSilhouetteSrc(code) {
    return "/" + `media/characters/silhouettes/${unprefixTraveler(code)}.svg`;
}

;// CONCATENATED MODULE: ./www/src/utils/domains.tsx
function getDomainIconSrc(domainType) {
    return "/" + `media/domains/${domainType}.png`;
}

;// CONCATENATED MODULE: ./www/src/utils/enemies.tsx
function getEnemyIconSrc(enemyCode) {
    return "/" + `media/enemies/${enemyCode}.png`;
}

;// CONCATENATED MODULE: ./www/src/utils/items.tsx
function getItemIconSrc(itemCode) {
    return "/" + `media/items/${itemCode}.png`;
}
function getItemIconLargeSrc(itemCode) {
    return "/" + `media/items/${itemCode}.large.png`;
}

;// CONCATENATED MODULE: ./www/src/media/Icon_Bow.png
/* harmony default export */ const Icon_Bow = (__webpack_require__.p + "Icon_Bow.e7c82786.png");
;// CONCATENATED MODULE: ./www/src/media/Icon_Catalyst.png
/* harmony default export */ const Icon_Catalyst = (__webpack_require__.p + "Icon_Catalyst.871a7999.png");
;// CONCATENATED MODULE: ./www/src/media/Icon_Claymore.png
/* harmony default export */ const Icon_Claymore = (__webpack_require__.p + "Icon_Claymore.46946e88.png");
;// CONCATENATED MODULE: ./www/src/media/Icon_Polearm.png
/* harmony default export */ const Icon_Polearm = (__webpack_require__.p + "Icon_Polearm.73080ee4.png");
;// CONCATENATED MODULE: ./www/src/media/Icon_Sword.png
/* harmony default export */ const Icon_Sword = (__webpack_require__.p + "Icon_Sword.a2824108.png");
;// CONCATENATED MODULE: ./www/src/utils/weapons.tsx





const weaponTypes = [
    { code: 'sword', imgSrc: Icon_Sword },
    { code: 'bow', imgSrc: Icon_Bow },
    { code: 'catalyst', imgSrc: Icon_Catalyst },
    { code: 'claymore', imgSrc: Icon_Claymore },
    { code: 'polearm', imgSrc: Icon_Polearm },
];
function getWeaponIconSrc(weaponCode) {
    return "/" + `media/weapons/${weaponCode}.png`;
}
function getWeaponIconLageSrc(weaponCode) {
    return "/" + `media/weapons/${weaponCode}.large.png`;
}

;// CONCATENATED MODULE: ./www/src/containers/alchemy-calculator.tsx




const DEF_ANCESTRY_CODES = [
    'agnidus-agate-sliver',
    'agnidus-agate-fragment',
    'agnidus-agate-chunk',
    'agnidus-agate-gemstone',
];
function AlchemyCalculator({ classes = '', ancestryCodes = DEF_ANCESTRY_CODES, }) {
    const [values, setValues] = (0,hooks/* useState */.eJ)([]);
    const onValueChange = (0,hooks/* useCallback */.I4)(e => {
        const value = +e.target.value;
        const index = +e.target.dataset.index;
        setValues(values.map((v, i) => (v = Math.floor(3 ** (index - i) * value))));
    }, [setValues, values]);
    (0,hooks/* useEffect */.d4)(() => {
        setValues(ancestryCodes.map((c, i) => 3 ** (ancestryCodes.length - 1 - i)));
    }, [ancestryCodes]);
    const startNotRoundClass = 'not-rounded-start';
    const endNotRoundClass = 'not-rounded-end';
    const endRoundClass = 'rounded-end';
    return ((0,jsxRuntime/* jsx */.tZ)("div", { className: `alchemy-calculator overflow-hidden ${classes}`, children: (0,jsxRuntime/* jsx */.tZ)("div", { className: "input-group", children: ancestryCodes.map((c, i) => {
                const isFirst = i === 0;
                const isLast = i === ancestryCodes.length - 1;
                const rarity = 5 - (ancestryCodes.length - 1 - i);
                return ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [i !== 0 ? ((0,jsxRuntime/* jsx */.tZ)("span", { className: `input-group-text text-dark border-light border-top border-bottom bg-${rarity - 1} ps-1`, children: '=' }, void 0)) : null, (0,jsxRuntime/* jsx */.tZ)("input", { type: "number", min: "0", className: `form-control bg-dark text-light text-end border-secondary pe-1 ${!isFirst ? startNotRoundClass : ''} ${endNotRoundClass}`, onInput: onValueChange, value: values[i], "data-index": i }, void 0), (0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getItemIconSrc(c), rarity: rarity, classes: `small-avatar with-padding input-group-avatar ${startNotRoundClass} ${!isLast ? endNotRoundClass : endRoundClass + ' border-end'} border-top border-bottom border-light` }, void 0)] }, void 0));
            }) }, void 0) }, void 0));
}

;// CONCATENATED MODULE: ./www/src/containers/item-cards/dd-cards.tsx























const LazyTeyvatMap = Promise.resolve(/* import() */).then(__webpack_require__.bind(__webpack_require__, 424));
function getRarityBorder(r) {
    return r === 5 ? 'border-warning' : 'border-light';
}
function RecommendedFor({ charCodes }) {
    return ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_RECOMENDED_FOR }, void 0), charCodes.length
                ? charCodes.map(c => ((0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getCharacterAvatarSrc(c), classes: `small-avatar mb-2 me-2 border ${getRarityBorder(4)}` }, void 0)))
                : I18N_FOR_NOBODY] }, void 0));
}
//переключалка для мобильного и десктопного вида
function CardDescMobileWrap({ children, targetEl, onClickAway, }) {
    const windowSize = useWindowSize();
    return BS_isBreakpointLessThen(windowSize.breakpoint, 'xl') ? ((0,jsxRuntime/* jsx */.tZ)(ItemDetailDdMobilePortal, { onClickAway: onClickAway, children: children }, void 0)) : ((0,jsxRuntime/* jsx */.tZ)(ItemDetailDdPortal, { onClickAway: onClickAway, targetEl: targetEl, children: children }, void 0));
}
// основной макет карточек
function Card({ classes = '', titleEl, selectorEl, bodyEl, mapEl, }) {
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: `item-detail-popover-card card ${classes}`, children: [(0,jsxRuntime/* jsxs */.BX)("h3", { className: "card-header fs-4 d-flex", children: [(0,jsxRuntime/* jsx */.tZ)("span", { className: "flex-fill", children: titleEl }, void 0), ' ', (0,jsxRuntime/* jsx */.tZ)(DdContext.Consumer, { children: ddContext => ddContext.onClickAway && ((0,jsxRuntime/* jsx */.tZ)("span", { class: "fs-4 lh-1 opacity-75 float-end ps-2 mt-1 c-pointer", type: "button", onClick: ddContext.onClickAway, children: TIMES }, void 0)) }, void 0)] }, void 0), selectorEl && (0,jsxRuntime/* jsx */.tZ)("div", { class: "p-3", children: selectorEl }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: `card-body overflow-auto flex-shrink-1 hide-if-empty mb-3 pb-0 ${selectorEl ? 'pt-0' : ''}`, children: bodyEl }, void 0), mapEl] }, void 0));
}
function addMarkerGroupsByDomains(markerGroups, domains) {
    for (const domain of domains) {
        const loc = domain.location;
        const icon = getDomainIconSrc(domain.type);
        markerGroups.push({ code: domain.code, title: domain.name, markers: [{ ...loc, icon }] });
    }
}
function addMarkerGroupsByEnemies(markerGroups, enemies) {
    for (const enemy of enemies) {
        const markers = enemy.locations === 'external'
            ? 'external'
            : enemy.locations.map((loc) => {
                const icon = getEnemyIconSrc(enemy.code);
                return { ...loc, icon, style: 'circle' };
            });
        markerGroups.push({ code: enemy.code, title: enemy.name, markers });
    }
}
function MapWrap({ itemData, markerGroups, isItemFavable, }) {
    const [selectedSource, setSelectedSource] = useSelectable(markerGroups);
    const [selectedMapCode, setMapCode] = (0,hooks/* useState */.eJ)(GI_MAP_CODES[0]);
    const TeyvatMap = useFetch(() => LazyTeyvatMap.then(x => x.TeyvatMap), []);
    const setSourceAndFixMapCode = (selectedSource) => {
        if (selectedSource.markers !== 'external' &&
            !selectedSource.markers.find(m => m.mapCode === selectedMapCode))
            setMapCode(selectedSource.markers[0].mapCode);
        setSelectedSource(selectedSource);
    };
    const goToPrevGroup = () => {
        setSourceAndFixMapCode(arrGetAfter(markerGroups, selectedSource, -1));
    };
    const goToNextGroup = () => {
        setSourceAndFixMapCode(arrGetAfter(markerGroups, selectedSource));
    };
    let sourceSelectEl;
    if (!markerGroups.length) {
        sourceSelectEl = null;
    }
    else if (markerGroups.length === 1) {
        sourceSelectEl = (0,jsxRuntime/* jsx */.tZ)("span", { className: "align-self-center lh-1 small", children: markerGroups[0].title }, void 0);
    }
    else if (markerGroups.length < 3) {
        sourceSelectEl = ((0,jsxRuntime/* jsx */.tZ)(BtnTabGroup, { tabs: markerGroups, selectedTab: selectedSource, onTabSelect: setSourceAndFixMapCode, classes: "w-100" }, void 0));
    }
    else {
        sourceSelectEl = ((0,jsxRuntime/* jsxs */.BX)("div", { className: "btn-group w-100", children: [(0,jsxRuntime/* jsx */.tZ)("button", { type: "button", class: "btn btn-secondary border-dark border-end-0 text-muted fs-4 lh-1", onClick: goToPrevGroup, children: LEFT_POINTING }, void 0), (0,jsxRuntime/* jsx */.tZ)(SimpleSelect, { options: markerGroups, selectedOption: selectedSource, onOptionSelect: setSourceAndFixMapCode, classes: "w-100 rounded-0" }, void 0), (0,jsxRuntime/* jsx */.tZ)("button", { type: "button", class: "btn btn-secondary border-dark border-start-0 text-muted fs-4 lh-1", onClick: goToNextGroup, children: RIGHT_POINTING }, void 0)] }, void 0));
    }
    const visibleMapCodes = (0,hooks/* useMemo */.Ye)(() => GI_MAP_CODES.filter(c => selectedSource.markers !== 'external' &&
        selectedSource.markers.some(m => m.mapCode === c)), [selectedSource]);
    const isItemWeaponPrimaryMaterial = (0,hooks/* useMemo */.Ye)(() => itemData?.item &&
        'types' in itemData.item &&
        ~itemData?.item.types?.indexOf('weapon-material-primary'), [itemData?.item]);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: `map-wrap position-relative mb-3`, children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "map-header position-absolute d-flex flex-row justify-content-between px-3 py-1 w-100", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "map-header-bg position-absolute top-0 start-0 w-100 h-100 bg-dark opacity-75" }, void 0), itemData && ((0,jsxRuntime/* jsxs */.BX)("div", { className: "me-2 flex-shrink-1 d-flex align-self-center", children: [isItemWeaponPrimaryMaterial && isItemFavable ? ((0,jsxRuntime/* jsx */.tZ)(ToggleWeaponPrimaryMaterialFav, { itemCode: itemData.item.code, classes: "align-self-center p-1 flex-fill fs-5" }, void 0)) : null, (0,jsxRuntime/* jsx */.tZ)(LabeledItemAvatar, { classes: "small-avatar small", avatarClasses: "with-padding ", imgSrc: itemData.imgSrc, title: itemData.item.name }, void 0)] }, void 0)), markerGroups.length ? ((0,jsxRuntime/* jsxs */.BX)("div", { className: `d-flex flex-fill justify-content-end align-self-center`, children: [(0,jsxRuntime/* jsxs */.BX)("label", { className: "me-1 text-muted align-self-center small", children: [I18N_SOURCE, ":"] }, void 0), sourceSelectEl] }, void 0)) : null] }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "map-tip position-absolute px-3 pt-1 lh-1 top-100 start-0 small text-muted opacity-75 user-select-none", children: visibleMapCodes.map(c => ((0,jsxRuntime/* jsxs */.BX)("div", { className: "d-inline me-2", onClick: () => setMapCode(c), children: [visibleMapCodes.length > 1 ? ((0,jsxRuntime/* jsx */.tZ)("input", { className: "lh-1 align-middle c-pointer me-1", type: "radio", id: c, checked: c === selectedMapCode }, void 0)) : null, (0,jsxRuntime/* jsx */.tZ)("label", { className: `lh-1 align-middle text-capitalize ${visibleMapCodes.length > 1 ? 'c-pointer' : ''}`, for: c, children: I18N_MAP_CODES_NAME[c] }, void 0)] }, c))) }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "map-tip position-absolute px-3 pt-1 lh-1 top-100 end-0 small text-muted opacity-75 pe-none", children: [(0,jsxRuntime/* jsx */.tZ)("div", { class: "d-none d-xl-block", children: I18N_SCROLL_TO_ZOOM }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { class: "d-xl-none", children: I18N_PINCH_TO_ZOOM }, void 0)] }, void 0), selectedSource.markers !== 'external' && isLoaded(TeyvatMap) ? ((0,jsxRuntime/* jsx */.tZ)(TeyvatMap, { classes: "position-relative", pos: "auto", mapCode: selectedMapCode, markers: selectedSource.markers }, void 0)) : TeyvatMap instanceof Error ? ((0,jsxRuntime/* jsxs */.BX)("div", { children: [I18N_ERROR, "."] }, void 0)) : ((0,jsxRuntime/* jsx */.tZ)(Spinner, {}, void 0))] }, void 0));
}
function ArtifactCard({ classes, artifacts, related, title, }) {
    const [selectedArt, setSelectedArt] = useSelectable(artifacts);
    const dataForMap = (0,hooks/* useMemo */.Ye)(() => {
        const srcs = selectedArt.obtainSources;
        const markerGroups = [];
        addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes));
        addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes));
        return {
            itemData: {
                item: selectedArt,
                imgSrc: getArtifactIconSrc(selectedArt.code),
            },
            markerGroups,
        };
    }, [selectedArt, related]);
    return ((0,jsxRuntime/* jsx */.tZ)(Card, { titleEl: title, classes: classes, selectorEl: artifacts.length > 1 ? ((0,jsxRuntime/* jsx */.tZ)(BtnTabGroup, { tabs: artifacts, titleFunc: tabTitleFromName, selectedTab: selectedArt, onTabSelect: setSelectedArt, classes: "w-100" }, void 0)) : null, bodyEl: (0,jsxRuntime/* jsxs */.BX)("div", { className: "", children: [(0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { rarity: selectedArt.rarity, classes: "float-end me-2 large-avatar", src: getArtifactIconLargeSrc(selectedArt.code) }, void 0), selectedArt.sets[1] && ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_PIECE_BONUS(1) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "mb-3", children: notesToJSX(selectedArt.sets[1]) }, void 0)] }, void 0)), selectedArt.sets[2] && ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_PIECES_BONUS(2) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "mb-3", children: notesToJSX(selectedArt.sets[2]) }, void 0)] }, void 0)), selectedArt.sets[4] && ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_PIECES_BONUS(4) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "mb-3", children: notesToJSX(selectedArt.sets[4]) }, void 0)] }, void 0)), (0,jsxRuntime/* jsx */.tZ)(RecommendedFor, { charCodes: selectedArt.recommendedTo }, void 0)] }, void 0), mapEl: dataForMap.markerGroups.length ? (0,jsxRuntime/* jsx */.tZ)(MapWrap, { ...dataForMap }, void 0) : null }, void 0));
}
function WeaponCard({ classes, weapon, related, }) {
    const materials = getAllRelated(related.items, weapon.materialCodes);
    const [materialOnMap, setMaterialOnMap] = (0,hooks/* useState */.eJ)(materials[0]);
    const dataForMap = (0,hooks/* useMemo */.Ye)(() => {
        const srcs = materialOnMap.obtainSources;
        const markerGroups = [];
        addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes));
        addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes));
        return {
            itemData: {
                item: materialOnMap,
                imgSrc: getItemIconSrc(materialOnMap.code),
            },
            markerGroups,
        };
    }, [materialOnMap, related]);
    return ((0,jsxRuntime/* jsx */.tZ)(Card, { titleEl: weapon.name, classes: classes, bodyEl: (0,jsxRuntime/* jsxs */.BX)("div", { className: "", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "float-end", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "d-flex w-100 justify-content-around", children: (0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { rarity: weapon.rarity, classes: "mb-2 large-avatar", src: getWeaponIconLageSrc(weapon.code) }, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "d-flex justify-content-between w-100", children: materials.map(m => ((0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { rarity: 2, classes: "mb-2 mx-1 small-avatar with-padding", src: getItemIconSrc(m.code), onClick: () => setMaterialOnMap(m) }, m.code))) }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "overflow-hidden", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { classes: "d-inline-block me-1", children: I18N_WEAPON_TYPE_NAME(weapon.typeCode) }, void 0), (0,jsxRuntime/* jsxs */.BX)("span", { className: "mb-2 text-muted", children: [BULLET, " ", weapon.obtainSources.map(I18N_WEAPON_OBTAIN_SOURCE_NAME).join(', ')] }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "d-flex", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "me-2", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "opacity-75", children: I18N_BASE_ATTACK }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "mb-2", children: [weapon.atk.base, " / ", weapon.atk.max] }, void 0)] }, void 0), weapon.subStat && ((0,jsxRuntime/* jsxs */.BX)("div", { className: "ms-1", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "opacity-75", children: I18N_STAT_NAME(weapon.subStat.code) }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "mb-2", children: [weapon.subStat.base, " / ", weapon.subStat.max] }, void 0)] }, void 0))] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "mb-3", children: [(0,jsxRuntime/* jsx */.tZ)("span", { className: "opacity-75", children: I18N_SECONDARY_STAT }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "", children: notesToJSX(weapon.passiveStat) }, void 0)] }, void 0), (0,jsxRuntime/* jsx */.tZ)(RecommendedFor, { charCodes: weapon.recommendedTo }, void 0)] }, void 0), mapEl: dataForMap.markerGroups.length ? (0,jsxRuntime/* jsx */.tZ)(MapWrap, { isItemFavable: true, ...dataForMap }, void 0) : null }, void 0));
}
function OtherItemCard({ classes, item, related, }) {
    const materials = getAllRelated(related.items, [item.code]);
    const materialOnMap = materials[0];
    const dataForMap = (0,hooks/* useMemo */.Ye)(() => {
        const markerGroups = [];
        const srcs = materialOnMap.obtainSources;
        addMarkerGroupsByDomains(markerGroups, getAllRelated(related.domains, srcs.domainCodes));
        addMarkerGroupsByEnemies(markerGroups, getAllRelated(related.enemies, srcs.enemyCodes));
        if (materialOnMap.locations.length > 0) {
            const icon = getItemIconSrc(materialOnMap.code);
            const markers = materialOnMap.locations === 'external'
                ? 'external'
                : materialOnMap.locations.map((loc) => ({ ...loc, icon, style: 'outline' }));
            markerGroups.push({ code: materialOnMap.code, title: materialOnMap.name, markers });
        }
        return {
            itemData: {
                item: materialOnMap,
                imgSrc: getItemIconSrc(materialOnMap.code),
            },
            markerGroups,
        };
    }, [materialOnMap, related]);
    const isItemCharTalentMaterial = (0,hooks/* useMemo */.Ye)(() => ~item.types.indexOf('character-material-talent'), [item]);
    const isItemWeaponPrimaryMaterial = (0,hooks/* useMemo */.Ye)(() => ~item.types.indexOf('weapon-material-primary'), [item]);
    const codesForCalc = (0,hooks/* useMemo */.Ye)(() => {
        return [...item.ancestryCodes.reverse(), item.code];
    }, [item]);
    return ((0,jsxRuntime/* jsx */.tZ)(Card, { titleEl: (0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [item.name, ' ', isItemCharTalentMaterial ? ((0,jsxRuntime/* jsx */.tZ)(ToggleTalentMaterialFav, { itemCode: item.code, classes: "d-inline align-middle p-1" }, void 0)) : null, isItemWeaponPrimaryMaterial ? ((0,jsxRuntime/* jsx */.tZ)(ToggleWeaponPrimaryMaterialFav, { itemCode: item.code, classes: "d-inline align-middle p-1" }, void 0)) : null] }, void 0), classes: classes, bodyEl: item.code === 'brilliant-diamond-gemstone' ? (I18N_OBTAINED_DURING_STORYLINE) : item.ancestryCodes.length > 0 ? ((0,jsxRuntime/* jsxs */.BX)("div", { className: "", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_ALCHEMY_CALC }, void 0), (0,jsxRuntime/* jsx */.tZ)(AlchemyCalculator, { ancestryCodes: codesForCalc }, void 0)] }, void 0)) : null, mapEl: dataForMap.markerGroups.length ? (0,jsxRuntime/* jsx */.tZ)(MapWrap, { ...dataForMap }, void 0) : null }, void 0));
}

;// CONCATENATED MODULE: ./www/src/containers/item-cards/item-avatars.tsx









function ItemAvatar({ src, rarity, classes = '', href, onClick, badgeTopStart, badgeTopEnd, ddComponent, }) {
    ;
    ['bg-2', 'bg-3', 'bg-4', 'bg-5'];
    const rarityClass = rarity ? 'bg-' + rarity : 'bg-dark';
    const elRef = (0,hooks/* useRef */.sO)(null);
    const [isExpanded, setIsExpanded] = (0,hooks/* useState */.eJ)(false);
    const closeDd = (0,hooks/* useCallback */.I4)(() => isExpanded && setIsExpanded(false), [setIsExpanded, isExpanded]);
    const openDd = (0,hooks/* useCallback */.I4)(() => !isExpanded && setIsExpanded(true), [setIsExpanded, isExpanded]);
    const pointerClass = ddComponent || onClick ? 'c-pointer' : '';
    const onClickLocal = (0,hooks/* useCallback */.I4)(() => {
        openDd && openDd();
        onClick && onClick();
    }, [openDd, onClick]);
    return ((0,jsxRuntime/* jsx */.tZ)(DdContext.Provider, { value: { onClickAway: closeDd }, children: (0,jsxRuntime/* jsxs */.BX)(A, { href: href, className: `item-avatar position-relative rounded-circle d-inline-block ${pointerClass} ${rarityClass} ${classes}`, innerRef: elRef, onClick: onClickLocal, children: [(0,jsxRuntime/* jsx */.tZ)("img", { className: "image", src: src }, void 0), badgeTopStart && ((0,jsxRuntime/* jsx */.tZ)("span", { className: "position-absolute top-0 start-0 translate-middle badge rounded-pill opacity-75 small", children: badgeTopStart }, void 0)), badgeTopEnd && ((0,jsxRuntime/* jsx */.tZ)("span", { className: "position-absolute top-0 start-100 translate-middle badge rounded-pill opacity-75 small", children: badgeTopEnd }, void 0)), isExpanded && elRef.current && ddComponent && ((0,jsxRuntime/* jsx */.tZ)(CardDescMobileWrap, { onClickAway: closeDd, targetEl: elRef.current, children: ddComponent }, void 0))] }, void 0) }, void 0));
}
function ItemLabel({ rarity, classes = '', children, }) {
    const rarityClass = rarity === 5 //
        ? 'text-warning'
        : rarity === 4
            ? 'text-primary'
            : '';
    //todo c-pointer text-decoration-underline-dotted для интерактивных
    return (0,jsxRuntime/* jsx */.tZ)("label", { class: `${classes} ${rarityClass}`, children: children }, void 0);
}
function ItemDd({ classes = '', children, ddComponent, }) {
    const elRef = (0,hooks/* useRef */.sO)(null);
    const [isExpanded, setIsExpanded] = (0,hooks/* useState */.eJ)(false);
    const closeDd = (0,hooks/* useCallback */.I4)(() => setIsExpanded(false), []);
    const openDd = (0,hooks/* useCallback */.I4)(() => setIsExpanded(true), []);
    const pointerClass = ddComponent ? 'c-pointer' : '';
    return ((0,jsxRuntime/* jsx */.tZ)(DdContext.Provider, { value: { onClickAway: closeDd }, children: (0,jsxRuntime/* jsxs */.BX)("button", { className: `btn-reset ${pointerClass} ${classes}`, ref: elRef, onClick: openDd, disabled: !ddComponent, children: [children, isExpanded && elRef.current && ddComponent && ((0,jsxRuntime/* jsx */.tZ)(CardDescMobileWrap, { onClickAway: closeDd, targetEl: elRef.current, children: ddComponent }, void 0))] }, void 0) }, void 0));
}
const ItemsDataContext = (0,preact/* createContext */.kr)({
    weapons: new Map(),
    artifacts: new Map(),
    domains: new Map(),
    enemies: new Map(),
    items: new Map(),
});
function ItemDetailsLabel({ classes = '', type, code, children, }) {
    const maps = (0,hooks/* useContext */.qp)(ItemsDataContext);
    let ddComp = undefined;
    let rarity = undefined;
    if (type === 'weapon') {
        const weapon = maps.weapons.get(code);
        if (weapon) {
            ddComp = (0,jsxRuntime/* jsx */.tZ)(WeaponCard, { weapon: weapon, related: maps }, void 0);
            rarity = weapon.rarity;
        }
    }
    else if (type === 'artifact') {
        const artifacts = getAllArtifacts(code, maps.artifacts);
        if (artifacts.length > 0) {
            const details = ART_GROUP_DETAILS[code] ?? artifacts[0];
            ddComp = (0,jsxRuntime/* jsx */.tZ)(ArtifactCard, { title: details.name, artifacts: artifacts, related: maps }, void 0);
            rarity = artifacts[0].rarity;
        }
    }
    else
        (0,values/* mustBeNever */.EX)(type);
    const interactiveLabelClass = ddComp ? 'text-decoration-underline-dotted' : '';
    return ((0,jsxRuntime/* jsx */.tZ)(ItemDd, { ddComponent: ddComp, classes: `d-inline ${classes}`, children: (0,jsxRuntime/* jsx */.tZ)(ItemLabel, { classes: `${interactiveLabelClass} c-inherit`, rarity: rarity, children: children }, void 0) }, void 0));
}
const DdContext = (0,preact/* createContext */.kr)({
    onClickAway: () => {
        return;
    },
});
function LabeledItemAvatar({ imgSrc, rarity, classes = '', avatarClasses = '', title, avatarTopStartBadge, avatarTopEndBadge, ddComponent, }) {
    const interactiveLabelClass = ddComponent ? 'text-decoration-underline-dotted' : '';
    return ((0,jsxRuntime/* jsxs */.BX)(ItemDd, { ddComponent: ddComponent, classes: `w-100 text-nowrap ${classes}`, children: [(0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { classes: `small-avatar align-middle ${avatarClasses}`, src: imgSrc, badgeTopStart: avatarTopStartBadge, badgeTopEnd: avatarTopEndBadge }, void 0), (0,jsxRuntime/* jsx */.tZ)(ItemLabel, { classes: 'text-wrap align-middle lh-1 ps-1 mw-75 c-inherit ' + interactiveLabelClass, rarity: rarity, children: title }, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/media/Element_Anemo.png
/* harmony default export */ const Element_Anemo = (__webpack_require__.p + "Element_Anemo.f809fde3.png");
;// CONCATENATED MODULE: ./www/src/media/Element_Cryo.png
/* harmony default export */ const Element_Cryo = (__webpack_require__.p + "Element_Cryo.019d72f9.png");
;// CONCATENATED MODULE: ./www/src/media/Element_Electro.png
/* harmony default export */ const Element_Electro = (__webpack_require__.p + "Element_Electro.342332ac.png");
;// CONCATENATED MODULE: ./www/src/media/Element_Geo.png
/* harmony default export */ const Element_Geo = (__webpack_require__.p + "Element_Geo.94f4e68a.png");
;// CONCATENATED MODULE: ./www/src/media/Element_Hydro.png
/* harmony default export */ const Element_Hydro = (__webpack_require__.p + "Element_Hydro.f2f8bd8a.png");
;// CONCATENATED MODULE: ./www/src/media/Element_Pyro.png
/* harmony default export */ const Element_Pyro = (__webpack_require__.p + "Element_Pyro.f65c2e38.png");
;// CONCATENATED MODULE: ./www/src/utils/elements.tsx

// import element_Dendro from '#src/media/Element_Dendro.png'





const elements_elements = [
    { code: 'pyro', imgSrc: Element_Pyro },
    { code: 'hydro', imgSrc: Element_Hydro },
    { code: 'anemo', imgSrc: Element_Anemo },
    { code: 'electro', imgSrc: Element_Electro },
    // { code: 'dendro' as const , imgSrc: element_Dendro },
    { code: 'cryo', imgSrc: Element_Cryo },
    { code: 'geo', imgSrc: Element_Geo },
];

;// CONCATENATED MODULE: ./www/src/containers/character-picker/mobile-character-picker.tsx







function CharacterPickerMobile() {
    const [selectedElementCode, setSelectedElementCode] = (0,hooks/* useState */.eJ)(null);
    const selectElement = el => setSelectedElementCode(selectedElementCode === el.code ? null : el.code);
    const [selectedWeaponTypeCode, setSelectedWeaponTypeCode] = (0,hooks/* useState */.eJ)(null);
    const selectWeaponType = wp => setSelectedWeaponTypeCode(selectedWeaponTypeCode === wp.code ? null : wp.code);
    const elementGroups = (0,hooks/* useMemo */.Ye)(() => {
        const filteredElements = selectedElementCode
            ? elements_elements.filter(x => x.code === selectedElementCode)
            : elements_elements;
        return filteredElements
            .map(element => ({
            element,
            characters: charactersShortList.filter(x => x.elementCode === element.code &&
                (selectedWeaponTypeCode === null || x.weaponTypeCode === selectedWeaponTypeCode)),
        }))
            .filter(x => x.characters.length > 0);
    }, [selectedElementCode, selectedWeaponTypeCode]);
    const rows = elementGroups.map(({ element, characters }) => ((0,jsxRuntime/* jsxs */.BX)("div", { className: "row py-2", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "col-2 py-1", children: (0,jsxRuntime/* jsx */.tZ)("img", { className: "rounded-circle d-block mx-auto muted-icon", src: element.imgSrc }, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "col py-31", children: characters.map(x => ((0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getCharacterAvatarSrc(x.code), 
                    // rarity={x.rarity}
                    href: '/builds/' + x.code, classes: `m-1 border ${x.rarity === 5 ? 'border-warning' : 'border-light'}` }, void 0))) }, void 0)] }, element.code)));
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "character-picker-mobile", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "m-auto text-center my-3", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "m-auto", children: "Filter " }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "d-inline", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "d-inline", children: elements_elements.map(el => ((0,jsxRuntime/* jsx */.tZ)("img", { className: `character-avatar small-avatar rounded-circle bg-secondary p-1 m-1 ${selectedElementCode && selectedElementCode !== el.code ? 'opacity-25' : ''}`, src: el.imgSrc, onClick: () => selectElement(el) }, el.code))) }, void 0), (0,jsxRuntime/* jsx */.tZ)("br", {}, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "d-inline", children: weaponTypes.map(wt => ((0,jsxRuntime/* jsx */.tZ)("img", { className: `character-avatar small-avatar rounded-circle bg-secondary p-1 m-1 ${selectedWeaponTypeCode && selectedWeaponTypeCode !== wt.code
                                        ? 'opacity-25'
                                        : ''}`, src: wt.imgSrc, onClick: () => selectWeaponType(wt) }, wt.code))) }, void 0)] }, void 0)] }, void 0), rows.length === 0 ? 'not yet' : rows] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/containers/character-picker/character-picker.tsx









function CharacterPickerDesktop({ weaponTypes }) {
    return ((0,jsxRuntime/* jsx */.tZ)(jsxRuntime/* Fragment */.HY, { children: elements_elements.map((el, i, arr) => {
            const isLastRowClass = i + 1 === arr.length ? 'rounded-bottom' : '';
            return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "row", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "col col-2 pt-3 pb-2 opacity-50 rounded-start", children: (0,jsxRuntime/* jsx */.tZ)("img", { className: "rounded-circle d-block mx-auto", src: el.imgSrc }, void 0) }, void 0), weaponTypes.map(wType => ((0,jsxRuntime/* jsx */.tZ)("div", { className: `col col-2 pt-3 pb-2 px-2 ${isLastRowClass}`, children: charactersShortList.filter(x => x.elementCode === el.code && x.weaponTypeCode === wType.code)
                            .map(x => ((0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getCharacterAvatarSrc(x.code), 
                            // rarity={x.rarity}
                            href: '/builds/' + x.code, classes: `mb-1 me-1 mb-xxl-2 me-xxl-2 border ${getRarityBorder(x.rarity)}` }, x.code))) }, wType.code)))] }, el.code));
        }) }, void 0));
}
function CharacterPicker() {
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "character-picker", children: [(0,jsxRuntime/* jsxs */.BX)("div", { class: "d-none d-xl-block container overflow-hidden big-table", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "row", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "col col-2 pb-3 pt-2" }, void 0), weaponTypes.map((wt, i) => ((0,jsxRuntime/* jsx */.tZ)("div", { className: "col col-2 pb-3 pt-2 rounded-top ", children: (0,jsxRuntime/* jsx */.tZ)("img", { className: "rounded-circle d-block mx-auto", src: wt.imgSrc }, void 0) }, wt.code)))] }, void 0), (0,jsxRuntime/* jsx */.tZ)(CharacterPickerDesktop, { weaponTypes: weaponTypes }, void 0)] }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { class: "d-xl-none", children: (0,jsxRuntime/* jsx */.tZ)(CharacterPickerMobile, {}, void 0) }, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/containers/character-picker/favorite-characters.tsx









const codeToBadge = (code) => {
    const e = elements_elements.find(e => code === `traveler-${e.code}`);
    return e ? (0,jsxRuntime/* jsx */.tZ)("img", { className: "badge-element-icon d-block ms-n1 mb-n1", src: e.imgSrc }, void 0) : null;
};
function FavoriteCharacters({ classes = '', onCharacterSelect, shoudSelectFirst, navigateToCharacter, }) {
    const [favCharCodes] = hooks_useLocalStorage('favoriteCharacterCodes', []);
    //todo sort characters by release date
    const charactersShortListCodes = (0,hooks/* useMemo */.Ye)(() => charactersShortList.map(c => c.code).filter(c => (~favCharCodes.indexOf(c) ? false : c)), [favCharCodes]);
    const characterCodes = favCharCodes.length < MAX_SMTHS_TO_STORE
        ? favCharCodes.concat(charactersShortListCodes.slice(0, MAX_SMTHS_TO_STORE - favCharCodes.length))
        : favCharCodes.slice(0, MAX_SMTHS_TO_STORE);
    // const optsForSelect = useMemo(
    // 	//todo выпилить или вставить нормальные имена
    // 	() =>
    // 		(characterCodes.length > 4 ? characterCodes.slice(4, characterCodes.length) : []).map(c => {
    // 			return { title: c, code: c }
    // 		}),
    // 	[characterCodes],
    // )
    // const onSelectViaSelect = useCallback(
    // 	opt => {
    // 		onCharacterSelect && onCharacterSelect(opt.code)
    // 	},
    // 	[onCharacterSelect],
    // )
    (0,hooks/* useEffect */.d4)(() => {
        shoudSelectFirst && onCharacterSelect && onCharacterSelect(characterCodes[0]);
    }, [onCharacterSelect, characterCodes, shoudSelectFirst]);
    const charactersElems = (0,hooks/* useMemo */.Ye)(() => characterCodes.map(code => ((0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getCharacterAvatarSrc(code), 
        // rarity={charactersShortList.find(x => x.code === code)?.rarity ?? 5}
        classes: "me-1 small-avatar", href: navigateToCharacter ? '/builds/' + code : undefined, onClick: () => onCharacterSelect && onCharacterSelect(code), badgeTopEnd: codeToBadge(code) }, code))), [characterCodes, onCharacterSelect, navigateToCharacter]);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: `favourite-characters ${classes}`, children: [(0,jsxRuntime/* jsx */.tZ)("label", { className: "opacity-75 pe-2 align-middle py-1", children: I18N_FAV_CHARACTERS }, void 0), (0,jsxRuntime/* jsx */.tZ)("br", { className: "d-xl-none" }, void 0), charactersElems] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/components/characters.tsx


function CharacterPortrait({ src, classes = '' }) {
    return (0,jsxRuntime/* jsx */.tZ)("img", { className: `character-portrait ${classes}`, src: src }, void 0);
}

;// CONCATENATED MODULE: ./www/src/utils/strings.ts
function strings_pluralizeEN(n, w0, w1) {
    if (n < 0)
        n = -n;
    const d0 = n % 10;
    const d10 = n % 100;
    if (d10 === 11 || d10 === 12 || d0 === 0 || (d0 >= 2 && d0 <= 9))
        return w1;
    return w0;
}
function strings_pluralizeRU(n, w0, w1, w3) {
    if (n < 0)
        n = -n;
    if (n % 10 === 1 && n % 100 !== 11) {
        return w0;
    }
    else if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) {
        return w1;
    }
    else {
        return w3;
    }
    return w0;
}

;// CONCATENATED MODULE: ./www/src/modules/builds/character-build-detailed.tsx



















function CharacterBuildDetailed({ build, isUpdating, }) {
    const roleTabs = build.character.roles;
    const characterCode = build.character.code;
    const [selectedRoleTab, setSelectedRoleTab] = useSelectable(roleTabs, [characterCode]);
    const weaponListBlock = (0,hooks/* useMemo */.Ye)(() => {
        const role = getRoleData(build, selectedRoleTab.code);
        if (!role)
            return [];
        return role.weapons.advices.map((advice, i) => {
            const isInList = advice.similar.length > 1;
            const map = advice.similar.map((item, i) => {
                const weapon = build.weapons.find(x => x.code === item.code);
                if (!weapon)
                    return null;
                const isLastInList = i >= advice.similar.length - 1;
                return ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [(0,jsxRuntime/* jsx */.tZ)(LabeledItemAvatar, { imgSrc: getWeaponIconSrc(weapon.code), title: weapon.name +
                                (item.refine === null ? '' : ` [${item.refine}]`) +
                                (item.stacks === null
                                    ? ''
                                    : ` (${item.stacks} ${strings_pluralizeEN(item.stacks, 'stack', 'stacks')})`), rarity: weapon.rarity, avatarClasses: "with-padding", classes: `small ${!isInList || isLastInList ? 'mb-1' : ''}`, ddComponent: (0,jsxRuntime/* jsx */.tZ)(WeaponCard, { weapon: weapon, related: build.maps }, void 0) }, void 0), genNotes(item), genSeeCharNotes(item), isInList && !isLastInList && ((0,jsxRuntime/* jsx */.tZ)(ItemsJoinerWrap, { children: I18N_CONJUCTIONS.or }, void 0))] }, void 0));
            });
            return ((0,jsxRuntime/* jsx */.tZ)("li", { className: "pt-1", children: isInList ? (0,jsxRuntime/* jsx */.tZ)(ItemsListGroupWrap, { children: map }, void 0) : map }, i));
        });
    }, [build, selectedRoleTab]);
    const artifactsListBlock = (0,hooks/* useMemo */.Ye)(() => {
        const role = getRoleData(build, selectedRoleTab.code);
        if (!role)
            return [];
        return role.artifacts.sets.map((set, i) => {
            return ((0,jsxRuntime/* jsxs */.BX)("li", { className: "pt-1", children: [genArtifactAdvice(set.arts, build), genNotes(set), genSeeCharNotes(set)] }, i));
        });
    }, [build, selectedRoleTab]);
    const artifactStatsAndSkillsBlock = (0,hooks/* useMemo */.Ye)(() => {
        const role = getRoleData(build, selectedRoleTab.code);
        return ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_ART_STATS_PRIORITY }, void 0), (0,jsxRuntime/* jsx */.tZ)("ul", { className: "mb-1 list-unstyled ms-1 small", children: CIRCLET_GOBLET_SANDS.map(ac => ((0,jsxRuntime/* jsxs */.BX)("li", { children: [(0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getArtifactTypeIconSrc(ac), classes: "small-avatar small my-1 mx-1 bg-dark with-padding align-middle" }, void 0), (0,jsxRuntime/* jsxs */.BX)("b", { className: "text-muted", children: [I18N_ART_TYPE(ac), " \u2014 "] }, void 0), genArtMainStatDetail(role, ac)] }, void 0))) }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "opacity-75 small", children: [notesToJSX(role.mainStats.notes), " ", genSeeCharNotes(role.mainStats)] }, void 0), (0,jsxRuntime/* jsx */.tZ)(BlockHeader, { classes: "mt-3", children: I18N_SUBSTATS_PRIORITY }, void 0), (0,jsxRuntime/* jsx */.tZ)("ol", { className: "mb-1 small", children: role.subStats.advices.map(advice => {
                        return ((0,jsxRuntime/* jsxs */.BX)("li", { children: [genSimpleList(advice.codes.map(I18N_STAT_NAME)), ' ' + genNotes(advice) + genSeeCharNotes(advice)] }, void 0));
                    }) }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "opacity-75 small", children: [notesToJSX(role.subStats.notes), " ", genSeeCharNotes(role.subStats)] }, void 0), (0,jsxRuntime/* jsx */.tZ)(BlockHeader, { classes: "mt-3", children: I18N_TALENTS_PRIORITY }, void 0), (0,jsxRuntime/* jsx */.tZ)("ol", { className: "small", children: role.talents.advices.map(advice => {
                        return (0,jsxRuntime/* jsx */.tZ)("li", { children: arrOrItemToArr(advice).map(I18N_TALENT_NAME) }, void 0);
                    }) }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "opacity-75 small", children: [notesToJSX(role.talents.notes), " ", genSeeCharNotes(role.subStats)] }, void 0)] }, void 0));
    }, [build, selectedRoleTab]);
    const notesBlock = (0,hooks/* useMemo */.Ye)(() => {
        const role = getRoleData(build, selectedRoleTab.code);
        return ((0,jsxRuntime/* jsxs */.BX)(jsxRuntime/* Fragment */.HY, { children: [(0,jsxRuntime/* jsx */.tZ)("div", { children: notesToJSX(role.tips) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { children: notesToJSX(role.notes) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { children: notesToJSX(build.character.credits) }, void 0)] }, void 0));
    }, [build, selectedRoleTab]);
    const materialsBlock = (0,hooks/* useMemo */.Ye)(() => {
        const materials = getAllRelated(build.maps.items, build.character.materialCodes);
        return ((0,jsxRuntime/* jsx */.tZ)("div", { className: "w-100 d-flex flex-wrap justify-content-between", children: materials.map(m => ((0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { classes: "mb-2 mx-1 small-avatar with-padding", src: getItemIconSrc(m.code), ddComponent: (0,jsxRuntime/* jsx */.tZ)(OtherItemCard, { item: m, related: build.maps }, void 0) }, void 0))) }, void 0));
    }, [build]);
    const CharacterDetailDesktop = ((0,jsxRuntime/* jsx */.tZ)("div", { className: "d-none d-xl-block", children: (0,jsxRuntime/* jsxs */.BX)("div", { className: "container", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "row", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "col col-3 p-0", children: (0,jsxRuntime/* jsxs */.BX)(A, { className: "btn btn-secondary align-self-center", type: "submit", href: "/builds", children: [(0,jsxRuntime/* jsx */.tZ)("span", { className: "fs-4 lh-1 opacity-75", children: "\u2039 " }, void 0), " ", I18N_BACK] }, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "col col-9", children: (0,jsxRuntime/* jsx */.tZ)(Tabs, { tabs: roleTabs, titleFunc: makeRoleTitle, selectedTab: selectedRoleTab, onTabSelect: setSelectedRoleTab }, void 0) }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "row", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "col col-3 pt-3", children: (0,jsxRuntime/* jsxs */.BX)("div", { className: "position-relative", children: [(0,jsxRuntime/* jsx */.tZ)(CharacterPortrait, { src: getCharacterPortraitSrc(characterCode), classes: "w-100" }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "mt-3", children: materialsBlock }, void 0), (0,jsxRuntime/* jsx */.tZ)(ToggleCharFav, { classes: "fs-3 position-absolute top-0 end-0", characterCode: characterCode }, void 0)] }, void 0) }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "col col-9", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "d-flex", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "flex-fill w-33 p-3", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_WEAPONS }, void 0), (0,jsxRuntime/* jsx */.tZ)("ol", { className: "items-list", children: weaponListBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "flex-fill w-33 p-3", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_ARTIFACTS }, void 0), (0,jsxRuntime/* jsx */.tZ)("ol", { className: "items-list", children: artifactsListBlock }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", {}, void 0)] }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "flex-fill w-33 p-3", children: artifactStatsAndSkillsBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "w-100", children: (0,jsxRuntime/* jsxs */.BX)("div", { className: "p-3", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_NOTES }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "text-muted", children: notesBlock }, void 0)] }, void 0) }, void 0)] }, void 0)] }, void 0)] }, void 0) }, void 0));
    const CharacterDetailMobile = ((0,jsxRuntime/* jsxs */.BX)("div", { className: "d-xl-none", children: [(0,jsxRuntime/* jsx */.tZ)(CharacterPortrait, { src: getCharacterSilhouetteSrc(characterCode), classes: "w-75 character-portrait-mobile" }, void 0), (0,jsxRuntime/* jsx */.tZ)(BtnTabGroup, { tabs: roleTabs, selectedTab: selectedRoleTab, onTabSelect: setSelectedRoleTab, classes: "w-100 mt-3 mb-0" }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "my-3", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_ASC_MATERIALS }, void 0), materialsBlock] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "my-3", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_ARTIFACTS }, void 0), (0,jsxRuntime/* jsx */.tZ)("ol", { className: "items-list", children: artifactsListBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "my-3", children: artifactStatsAndSkillsBlock }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "my-3", children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_WEAPONS }, void 0), (0,jsxRuntime/* jsx */.tZ)("ol", { className: "items-list", children: weaponListBlock }, void 0)] }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { children: [(0,jsxRuntime/* jsx */.tZ)(BlockHeader, { children: I18N_NOTES }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "opacity-75", children: notesBlock }, void 0)] }, void 0)] }, void 0));
    return ((0,jsxRuntime/* jsx */.tZ)(ItemsDataContext.Provider, { value: build.maps, children: (0,jsxRuntime/* jsxs */.BX)("div", { className: "character-build-detailed mt-2 mb-3 position-relative", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "d-flex d-xl-none mt-3", children: [(0,jsxRuntime/* jsxs */.BX)(A, { className: "btn btn-secondary align-self-center", type: "submit", href: "/builds", children: [(0,jsxRuntime/* jsx */.tZ)("span", { className: "fs-4 lh-1 opacity-75", children: "\u2039 " }, void 0), " ", I18N_BACK] }, void 0), (0,jsxRuntime/* jsx */.tZ)("h5", { className: "ps-3 pe-1 m-0 align-self-center", children: build.character.name }, void 0), (0,jsxRuntime/* jsx */.tZ)(ToggleCharFav, { classes: "fs-3 align-self-center", characterCode: characterCode }, void 0), (0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getCharacterAvatarLargeSrc(characterCode), classes: "large-avatar align-self-end mt-n5 ms-auto" }, void 0)] }, void 0), isUpdating ? (0,jsxRuntime/* jsx */.tZ)(CentredSpinner, {}, void 0) : null, (0,jsxRuntime/* jsxs */.BX)("div", { className: isUpdating ? 'opacity-50 pe-none' : '', children: [CharacterDetailDesktop, CharacterDetailMobile] }, void 0)] }, void 0) }, void 0));
}

;// CONCATENATED MODULE: ./www/src/pages/builds.tsx









function BuildsPage_CharSelect() {
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "builds container", children: [(0,jsxRuntime/* jsx */.tZ)("h1", { className: "my-1 letter-spacing-1", children: I18N_CHAR_BUILD_RECS }, void 0), (0,jsxRuntime/* jsx */.tZ)("h5", { className: "mt-2 mb-3 opacity-75", children: I18N_SELECT_CHAR_ABOVE }, void 0), (0,jsxRuntime/* jsx */.tZ)(FavoriteCharacters, { navigateToCharacter: true, classes: "mb-2" }, void 0), (0,jsxRuntime/* jsx */.tZ)(CharacterPicker, {}, void 0)] }, void 0));
}
function BuildsPage_BuildDetail({ code }) {
    const [build, isUpdating] = useBuildWithDelayedLocs(code);
    (0,hooks/* useEffect */.d4)(() => {
        window.scrollTo(0, 0);
    }, []);
    if (!isLoaded(build))
        return (0,jsxRuntime/* jsx */.tZ)(Spinner, {}, void 0);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "builds container", children: [(0,jsxRuntime/* jsxs */.BX)("h1", { className: `my-1 letter-spacing-1 ${global._SSR_LANG === 'en' ? 'text-capitalize' : ''}`, children: [(0,jsxRuntime/* jsx */.tZ)("span", { className: "d-none d-xl-inline", children: build.character.name }, void 0), " ", I18N_BUILD_RECS_FOR] }, void 0), (0,jsxRuntime/* jsx */.tZ)(FavoriteCharacters, { navigateToCharacter: true }, void 0), (0,jsxRuntime/* jsx */.tZ)(CharacterBuildDetailed, { build: build, isUpdating: isUpdating }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "col-lg-9 offset-lg-3 col-12", children: (0,jsxRuntime/* jsx */.tZ)("a", { href: "https://docs.google.com/spreadsheets/d/1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI/pubhtml#", className: "fs-6 d-block my-3 text-center text-muted small", children: I18N_BASED_ON_GIHT }, void 0) }, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/modules/equipment/weapons-list.tsx


const cats = [
    { title: 'Weapons', code: 'weapons' },
    { title: 'Artifacts', code: 'artifacts' },
];
const weapons = new Array(23).fill('1'); //todo
function WeaponsList() {
    const [selectedCatCode, setSelectedCatCode] = (0,hooks/* useState */.eJ)(null);
    const selectCat = (0,hooks/* useCallback */.I4)(tab => setSelectedCatCode(tab.code), [setSelectedCatCode]);
    const selectedCat = (0,hooks/* useMemo */.Ye)(() => cats.find(c => c.code === selectedCatCode) || cats[0], [selectedCatCode]);
    console.log(weapons);
    return ((0,jsxRuntime/* jsx */.tZ)("div", { children: weapons.map(w => ((0,jsxRuntime/* jsxs */.BX)("div", { className: "row", children: [(0,jsxRuntime/* jsx */.tZ)("div", { className: "col", children: "1" }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "col", children: "2" }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "col", children: "3" }, void 0)] }, void 0))) }, void 0));
}

;// CONCATENATED MODULE: ./www/src/modules/equipment/equipment.tsx




const equipment_cats = [
    { title: 'Weapons', code: 'weapons' },
    { title: 'Artifacts', code: 'artifacts' },
];
function Equipment() {
    const [selectedCatCode, setSelectedCatCode] = (0,hooks/* useState */.eJ)(null);
    const selectCat = (0,hooks/* useCallback */.I4)(tab => setSelectedCatCode(tab.code), [setSelectedCatCode]);
    const selectedCat = (0,hooks/* useMemo */.Ye)(() => equipment_cats.find(c => c.code === selectedCatCode) || equipment_cats[0], [selectedCatCode]);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "equipment container", children: [(0,jsxRuntime/* jsx */.tZ)("h1", { className: "my-1 letter-spacing-1", children: "Character equipment" }, void 0), (0,jsxRuntime/* jsx */.tZ)(Tabs, { classes: "w-100", tabs: equipment_cats, onTabSelect: selectCat, selectedTab: selectedCat }, void 0), (0,jsxRuntime/* jsx */.tZ)(WeaponsList, {}, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/pages/equipment.tsx


function EquipmentPage() {
    return (0,jsxRuntime/* jsx */.tZ)(Equipment, {}, void 0);
}

;// CONCATENATED MODULE: ./www/src/containers/farm-today.tsx

















function FarmToday({ classes = '' }) {
    const ttData = useFetch(apiMaterialsTimetable, []);
    const [selectedRegionCode] = hooks_useLocalStorage(SK_SELECTED_REGION_CODE, SK_DEFAULT_SELECTED_REGION_CODE);
    const { weekdayMonSun, weekdayCode } = getRegionTime(selectedRegionCode);
    const tomorrowCode = arrGetAfter(GI_ROTATION_WEEKDAY_CODES, weekdayCode);
    const [favCharCodes] = hooks_useLocalStorage(SK_FAV_CHAR_CODES, []);
    const [favTalMaterialCodes] = hooks_useLocalStorage(SK_FAV_TALENT_MATERIAL_CODES, []);
    // const [favWeaponDatas] = useLocalStorage<STORAGE_WEAPON_DATA[]>(SK_FAV_WEAPON_DATAS, [])
    // const favWeapMatCodes = useMemo(() => [...favWeaponDatas.map(wd => wd[1])], [favWeaponDatas])
    const [favWeapPrimMatCodes] = hooks_useLocalStorage(SK_FAV_WEAPON_PRIMARY_MATERIAL_CODES, []);
    const forceUpdate = useForceUpdate();
    useVisibleTicker(() => {
        forceUpdate();
    }, 60 * 1000);
    const tabs = (0,hooks/* useMemo */.Ye)(() => [
        {
            code: weekdayCode,
            title: `${I18N_WEEKDAYS[weekdayMonSun]}, ${I18N_TODAY}`,
        },
        { code: tomorrowCode, title: I18N_TOMORROW },
    ], [weekdayCode, tomorrowCode, weekdayMonSun]);
    const [selectedTab, setSelectedTab] = useSelectable(tabs, [selectedRegionCode]);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: `farm-today ${classes}`, children: [ false && (0), isLoaded(ttData) && !true ? (0) : ((0,jsxRuntime/* jsx */.tZ)(Spinner, {}, void 0)), (0,jsxRuntime/* jsx */.tZ)("div", { className: "text-muted small text-center px-2 mx-1 py-3", children: I18N_WHY_ADD_TO_FAVS_TIP }, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/containers/region-switch.tsx






const europeOpt = { title: I18N_EUROPE, code: 'europe' };
const options = [
    europeOpt,
    { title: I18N_ASIA, code: 'asia' },
    { title: I18N_NORH_AMERICA, code: 'north-america' },
];
function RegionSwitch({ classes = '' }) {
    const [selectedRegionCode, setSelectedRegionCode] = hooks_useLocalStorage(SK_SELECTED_REGION_CODE, SK_DEFAULT_SELECTED_REGION_CODE);
    const selectedOption = (0,hooks/* useMemo */.Ye)(() => options.find(o => o.code === selectedRegionCode) || europeOpt, [selectedRegionCode]);
    const onOptSelectLocal = (0,hooks/* useCallback */.I4)(o => setSelectedRegionCode(o.code), [setSelectedRegionCode]);
    return ((0,jsxRuntime/* jsx */.tZ)(SimpleSelect, { options: options, selectedOption: selectedOption, onOptionSelect: onOptSelectLocal }, void 0));
}

;// CONCATENATED MODULE: ./www/src/utils/dates.tsx


function msToHmWords(duration) {
    const minutes = Math.floor((duration / (1000 * 60)) % 60), hours = Math.floor((duration / (1000 * 60 * 60)) % 24);
    const pluralizeFunc = global._SSR_LANG === 'en' ? pluralizeEN : pluralizeRU;
    return `${hours} ${pluralizeFunc(hours, I18N_HOUR, I18N_HOURS, I18N_HOURS_3)} ${minutes} ${pluralizeFunc(minutes, I18N_MINUTE, I18N_MINUTES, I18N_MINUTES_3)}`;
}

;// CONCATENATED MODULE: ./www/src/containers/time-until-day-reset.tsx






function TimeUntilDayReset({ classes = '' }) {
    const [selectedRegionCode] = hooks_useLocalStorage(SK_SELECTED_REGION_CODE, SK_DEFAULT_SELECTED_REGION_CODE);
    const { resetIn } = getRegionTime(selectedRegionCode);
    const forceUpdate = useForceUpdate();
    useVisibleTicker(() => {
        forceUpdate();
    }, 60 * 1000);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: `time-until-day-reset ${classes}`, children: [ true ? ELLIPSIS : 0, (0,jsxRuntime/* jsx */.tZ)("span", { className: "animation-time-glow ps-1", children: BULLET }, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/modules/builds/character-build-preview.tsx

















function CharacterBuildPreview({ characterCode }) {
    const [build, isUpdating] = useBuildWithDelayedLocs(characterCode);
    const displayingCharacterCode = isLoaded(build) ? build.character.code : characterCode;
    const roleTabs = isLoaded(build) ? build.character.roles : DUMMY_ROLES;
    const [selectedRoleTab, setSelectedRoleTab] = useSelectable(roleTabs, [displayingCharacterCode]);
    const artifactsListBlock = (0,hooks/* useMemo */.Ye)(() => {
        if (!isLoaded(build))
            return [];
        const role = getRoleData(build, selectedRoleTab.code);
        if (!role)
            return [];
        const listTimit = 1;
        return ((0,jsxRuntime/* jsxs */.BX)("ol", { children: [role.artifacts.sets.map((set, i) => {
                    if (i > listTimit)
                        return;
                    return ((0,jsxRuntime/* jsx */.tZ)("li", { className: "pt-1", children: genArtifactAdvice(set.arts, build, false) }, i));
                }), role.artifacts.sets.length > listTimit ? ((0,jsxRuntime/* jsx */.tZ)("li", { className: "pt-1 text-muted", children: (0,jsxRuntime/* jsx */.tZ)(A, { className: "link-secondary text-muted", href: `/builds/` + characterCode, children: I18N_MORE_ON_BUILDS_PAGE }, void 0) }, void 0)) : null] }, void 0));
    }, [characterCode, build, selectedRoleTab]);
    const artifactMainStatsBlock = (0,hooks/* useMemo */.Ye)(() => {
        if (!isLoaded(build))
            return null;
        const role = getRoleData(build, selectedRoleTab.code);
        return ((0,jsxRuntime/* jsx */.tZ)("ul", { className: "mb-1 list-unstyled ms-1 pt-1 ps-2 small", children: CIRCLET_GOBLET_SANDS.map(ac => ((0,jsxRuntime/* jsxs */.BX)("li", { children: [(0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { src: getArtifactTypeIconSrc(ac), classes: "mb-1 mx-1 small-avatar bg-dark with-padding align-middle" }, void 0), genArtMainStatDetail(role, ac, true)] }, void 0))) }, void 0));
    }, [build, selectedRoleTab]);
    const artifactSubStatsBlock = (0,hooks/* useMemo */.Ye)(() => {
        if (!isLoaded(build))
            return null;
        const role = getRoleData(build, selectedRoleTab.code);
        return ((0,jsxRuntime/* jsx */.tZ)("ol", { className: "mb-1 pt-2 small", children: role.subStats.advices.map(advice => {
                return (0,jsxRuntime/* jsx */.tZ)("li", { children: genSimpleList(advice.codes.map(I18N_STAT_NAME)) }, void 0);
            }) }, void 0));
    }, [build, selectedRoleTab]);
    const talentsBlock = (0,hooks/* useMemo */.Ye)(() => {
        if (!isLoaded(build))
            return null;
        const role = getRoleData(build, selectedRoleTab.code);
        return ((0,jsxRuntime/* jsx */.tZ)(jsxRuntime/* Fragment */.HY, { children: (0,jsxRuntime/* jsx */.tZ)("ol", { className: "small", children: role.talents.advices.map(advice => {
                    return (0,jsxRuntime/* jsx */.tZ)("li", { children: arrOrItemToArr(advice).map(I18N_TALENT_NAME) }, void 0);
                }) }, void 0) }, void 0));
    }, [build, selectedRoleTab]);
    const materialsBlock = (0,hooks/* useMemo */.Ye)(() => {
        //todo только главные
        if (!isLoaded(build))
            return null;
        const materials = getAllRelated(build.maps.items, build.character.materialCodes);
        return ((0,jsxRuntime/* jsx */.tZ)("div", { className: "d-flex justify-content-between flex-wrap px-2", children: materials.map(m => ((0,jsxRuntime/* jsx */.tZ)(ItemAvatar, { classes: "mb-2 mx-1 small-avatar with-padding flex-shrink-0", src: getItemIconSrc(m.code), ddComponent: (0,jsxRuntime/* jsx */.tZ)(OtherItemCard, { item: m, related: build.maps }, void 0) }, void 0))) }, void 0));
    }, [build]);
    if (!isLoaded(build))
        return (0,jsxRuntime/* jsx */.tZ)(Spinner, {}, void 0);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "character-build-preview position-relative", children: [isUpdating ? (0,jsxRuntime/* jsx */.tZ)(CentredSpinner, {}, void 0) : null, (0,jsxRuntime/* jsxs */.BX)("div", { className: isUpdating ? 'opacity-50 pe-none' : '', children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "d-none d-xl-flex ", children: [(0,jsxRuntime/* jsx */.tZ)("h5", { className: "py-2 m-0 me-2 d-block ", children: build.character.name }, void 0), (0,jsxRuntime/* jsx */.tZ)(Tabs, { tabs: roleTabs, titleFunc: makeRoleTitle, selectedTab: selectedRoleTab, onTabSelect: setSelectedRoleTab, classes: "mb-2 flex-grow-1" }, displayingCharacterCode)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "d-flex d-xl-none align-items-center", children: [(0,jsxRuntime/* jsx */.tZ)("h5", { className: "mb-0 pt-2 me-2", children: build.character.name }, void 0), (0,jsxRuntime/* jsx */.tZ)(BtnTabGroup, { tabs: roleTabs, titleFunc: makeRoleTitle, selectedTab: selectedRoleTab, onTabSelect: setSelectedRoleTab, classes: "w-100 mt-3 mb-2" }, displayingCharacterCode)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "row small gy-2", children: [(0,jsxRuntime/* jsxs */.BX)("div", { className: "col-lg-4 col-12", children: [(0,jsxRuntime/* jsx */.tZ)("h6", { className: "opacity-75", children: I18N_ARTIFACTS }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { children: artifactsListBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "col-lg-4 col-6", children: [(0,jsxRuntime/* jsx */.tZ)("h6", { className: "opacity-75", children: I18N_ART_STATS_PRIORITY }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { children: artifactMainStatsBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "col-lg-4 col-6", children: [(0,jsxRuntime/* jsx */.tZ)("h6", { className: "opacity-75", children: I18N_SUBSTATS_PRIORITY }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { children: artifactSubStatsBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "col-lg-4 col-6", children: [(0,jsxRuntime/* jsx */.tZ)("h6", { className: "opacity-75", children: I18N_TALENTS_PRIORITY }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { children: talentsBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "col-lg-8 col-6", children: [(0,jsxRuntime/* jsx */.tZ)("h6", { className: "opacity-75", children: I18N_ASC_MATERIALS }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { children: materialsBlock }, void 0)] }, void 0), (0,jsxRuntime/* jsx */.tZ)("div", { className: "col-12", children: (0,jsxRuntime/* jsx */.tZ)(A, { type: "button", className: "btn btn-link btn-sm w-100", href: `/builds/` + characterCode, children: I18N_FULL_BUILD_INFO }, void 0) }, void 0)] }, void 0)] }, void 0)] }, void 0));
}
function BuildsPreviewsWrap({ classes = '' }) {
    const [selectedCharacterCode, setSelectedCharacterCode] = (0,hooks/* useState */.eJ)(null);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: `character-build-preview ${classes}`, children: [(0,jsxRuntime/* jsx */.tZ)(FavoriteCharacters, { onCharacterSelect: setSelectedCharacterCode, shoudSelectFirst: !selectedCharacterCode, navigateToCharacter: false, classes: "mb-2" }, void 0), selectedCharacterCode ? ((0,jsxRuntime/* jsx */.tZ)(CharacterBuildPreview, { characterCode: selectedCharacterCode }, void 0)) : ((0,jsxRuntime/* jsx */.tZ)(Spinner, {}, void 0))] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/pages/front-page.tsx







function Fieldset({ children, legend, classes = '' }) {
    return ((0,jsxRuntime/* jsxs */.BX)("fieldset", { className: `my-2 ${classes}`, children: [(0,jsxRuntime/* jsx */.tZ)("legend", { className: "opacity-75 mb-2", children: legend }, void 0), children] }, void 0));
}
function FrontPage() {
    return ((0,jsxRuntime/* jsxs */.BX)("div", { className: "dashboard container ", children: [(0,jsxRuntime/* jsx */.tZ)("h1", { className: "my-1 letter-spacing-1", children: I18N_DASHBOARD }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "row", children: [(0,jsxRuntime/* jsx */.tZ)(Fieldset, { legend: I18N_REGION, classes: "col-lg-3 col-12", children: (0,jsxRuntime/* jsx */.tZ)(RegionSwitch, {}, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)(Fieldset, { legend: I18N_UNTIL_DAY_RESET, classes: "col-lg-3 col-12", children: (0,jsxRuntime/* jsx */.tZ)(TimeUntilDayReset, { classes: "fs-4" }, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)(Fieldset, { legend: I18N_ALCHEMY_CALC, classes: "col-lg-6 col-12 ", children: (0,jsxRuntime/* jsx */.tZ)(AlchemyCalculator, {}, void 0) }, void 0)] }, void 0), (0,jsxRuntime/* jsxs */.BX)("div", { className: "row", children: [(0,jsxRuntime/* jsx */.tZ)(Fieldset, { classes: "col-lg-6 col-12", legend: I18N_WHAT_TO_FARM, children: (0,jsxRuntime/* jsx */.tZ)(FarmToday, {}, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)(Fieldset, { classes: "col-lg-6 col-12", legend: I18N_BUILDS, children: (0,jsxRuntime/* jsx */.tZ)(BuildsPreviewsWrap, {}, void 0) }, void 0)] }, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/App.tsx











const routes = [
    route(paths.front, FrontPage),
    route(paths.builds, BuildsPage_CharSelect),
    route(paths.buildCharacters, BuildsPage_BuildDetail),
    route(paths.equipment, EquipmentPage),
];
function App() {
    const page = useRouter(routes);
    return ((0,jsxRuntime/* jsxs */.BX)("div", { class: "d-flex flex-column app-container", children: [(0,jsxRuntime/* jsx */.tZ)(Header, {}, void 0), (0,jsxRuntime/* jsx */.tZ)("main", { children: (0,jsxRuntime/* jsx */.tZ)(PageWrap, { children: page }, void 0) }, void 0), (0,jsxRuntime/* jsx */.tZ)(Footer, {}, void 0)] }, void 0));
}

;// CONCATENATED MODULE: ./www/src/index.tsx

if (false) {}



const renderPage =  true
    ? html => html.replace(/(<div class="app">)/, (_, div) => div + m((0,jsxRuntime/* jsx */.tZ)(App, {}, void 0), null, { pretty: false }))
    : 0;

})();

var __webpack_exports__renderPage = __webpack_exports__.X;
export { __webpack_exports__renderPage as renderPage };

//# sourceMappingURL=main.ssr.js.map