import { AlchemyCalculator } from '#src/containers/alchemy-calculator'
import { FarmToday } from '#src/containers/farm-today'
import { BuildsPreviewsWrap } from '#src/modules/builds/build-preview'

function Fieldset({ children, legend, classes = '' }) {
	return (
		<fieldset className={`my-2 ${classes}`}>
			<legend className="text-capitalize opacity-75 mb-2">{legend}</legend>
			{children}
		</fieldset>
	)
}
export function FrontPage() {
	return (
		<div className="dashboard container">
			<h1 className="my-1">Dashboard</h1>
			<div className="row">
				<Fieldset legend="alchemy calculator">
					<AlchemyCalculator />
				</Fieldset>
			</div>
			<div className="row">
				<Fieldset classes="col-lg-6 col-12" legend="farm today">
					<FarmToday />
				</Fieldset>
				<Fieldset classes="col-lg-6 col-12" legend="builds">
					<BuildsPreviewsWrap />
				</Fieldset>
			</div>
		</div>
	)
}
