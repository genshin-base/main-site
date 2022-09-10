// чарт оформлен как самостоятельный компонент, который будет удобно использовать
// и с реактивными библиотеками, и нативными проектами.
// если понадобится поддержка старых браузеров, то можно сконвертировать код вебпаком
let charts = []
let defaultTheme = 'day'
function addChart({ detailsPath, data: chartData }, count) {
	//if (charts.length != 0) return

	if (location.hash.startsWith('#h')) {
		if (~location.hash.indexOf('1')) {
			// больше линий
			let valCols = chartData.columns.filter(values => values[0] != 'x')
			while (chartData.columns.length < 51) {
				let n = chartData.columns.length
				let src = valCols[n % valCols.length]
				let code = src[0] + n
				let values = src.slice()
				values[0] = code
				chartData.columns.push(values)
				chartData.types[code] = chartData.types[src[0]]
				chartData.names[code] = chartData.names[src[0]] + ' ' + n
				chartData.colors[code] = chartData.colors[src[0]]
				if (chartData.types[values[0]] == 'line')
					for (let i = 1; i < values.length; i++) values[i] *= 1 / n
			}
		}

		if (~location.hash.indexOf('2')) {
			//больше длина
			for (let i = 0; i < 2; i++) {
				for (let values of chartData.columns) {
					values.push.apply(values, values.slice(1))
					if (values[0] == 'x') {
						let mid = (values.length - 1) / 2
						let shift =
							values[mid] - values[mid + 1] + values[mid] - values[mid - 1]
						for (let i = mid + 1; i < values.length; i++) values[i] += shift
					}
				}
			}
		}

		let cols = chartData.columns
		console.log(`cols: ${cols.length}, points: ${cols[0].length - 1}`)
	}

	chartData.title = `Funny title #${count + 1}`
	if (detailsPath) {
		chartData.x_on_zoom = function(stamp) {
			let dateStr = new Date(stamp).toISOString()
			let path = `${detailsPath}/${dateStr.substr(0, 7)}/${dateStr.substr(
				8,
				2,
			)}.json`
			return fetch(path).then(r => r.json())
		}
	}

	let wrap = document.createElement('div')
	document.body.appendChild(wrap)
	let chart = Graph.render(wrap, chartData)
	charts.push(chart)
}

function onReady() {
	if (location.hash == '#t') {
		window.scrollTo(0, document.body.scrollHeight - 200)
		let c = charts[charts.length - 1]
		let stt = Date.now()
		let framesCount = 0
		let framesStt = stt + 2000

		c.view.dest.xPosFrom = c.view.dest.xPosFromDest = 0
		c.view.dest.xPosTo = c.view.dest.xPosToDest = 1
		c.view.cur.xPosFrom = c.view.cur.xPosFromDest = 0
		c.view.cur.xPosTo = c.view.cur.xPosToDest = 1

		let frame = function() {
			let now = Date.now()
			let dif = now - stt
			c.onChartMove(0, Math.sin(dif / 250) / 7 + 0.82 - c.view.xRealPosTo)
			if (now > framesStt + 5 * 1000) {
				alert((framesCount / (now - framesStt)) * 1000)
				return
			}
			if (now >= framesStt) {
				framesCount++
			}
			requestAnimationFrame(frame, c.wrap)
		}
		frame()
	}

	function throwEvent(elem, name, data, bubbles) {
		if (!data) data = {}
		var myEvent = new CustomEvent(name, {
			detail: data,
			bubbles: !!bubbles,
		})
		elem.dispatchEvent(myEvent)
	}

	let toggleNightModeButton = new ToggleNightModeButton({
		parentEl: document.body,
		isDayMode: true,
		theme: defaultTheme,
		onChange: isDayMode => {
			toggleNightModeButton.toggleState(isDayMode)
			document.documentElement.classList.toggle('dark', !isDayMode)
			throwEvent(document, 'darkmode')
		},
		params: { locale: 'en' },
	})
	window.loading_placeholder.parentElement.removeChild(window.loading_placeholder)
}

// let fetches = ['1', '2', '3', '4', '5'].map(folderName => {
// 	let chartPath = `./chart_data_v2/${folderName}`
// 	return fetch(`${chartPath}/overview.json`)
// 		.then(r => r.json())
// 		.then(data => ({ detailsPath: folderName == '5' ? null : chartPath, data }))
// })
// fetches.push(
// 	fetch('chart_data.json')
// 		.then(r => r.json())
// 		.then(chartsData => ({
// 			detailsPath: null,
// 			data: chartsData[chartsData.length - 1],
// 		})),
// )
let fetches = [fetch('./chart_data_v2/test/overview.json')
.then(r => r.json())
.then(chartsData => ({
	detailsPath: null,
	data: chartsData,
})),]

Promise.all(fetches)
	.then(res => {
		console.log(res)
		res.forEach((d, i) => addChart(d, i))
		onReady()
	})
	.catch(err => console.error(err))
