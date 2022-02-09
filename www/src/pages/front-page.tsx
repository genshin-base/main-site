import { AlchemyCalculator } from '#src/containers/alchemy-calculator'
import { FarmToday } from '#src/containers/farm-today'
import { RegionSwitch } from '#src/containers/region-switch'
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
		<div className="dashboard container ">
			<h1 className="my-1">Dashboard</h1>
			<div className="row">
				<Fieldset legend="Region switch" classes="col-lg-3 col-12">
					<RegionSwitch />
				</Fieldset>
				<Fieldset legend="alchemy calculator" classes="col-lg-6 col-12 offset-lg-3 offset-0">
					<AlchemyCalculator />
				</Fieldset>
			</div>
			<div className="row">
				<Fieldset classes="col-lg-6 col-12" legend="what to farm">
					<FarmToday />
				</Fieldset>
				<Fieldset classes="col-lg-6 col-12" legend="builds">
					<BuildsPreviewsWrap />
				</Fieldset>
			</div>
		</div>
	)
}
