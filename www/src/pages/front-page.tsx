import { AlchemyCalculator } from '#src/containers/alchemy-calculator'
import { FarmToday } from '#src/containers/farm-today'
import { RegionSwitch } from '#src/containers/region-switch'
import { TimeUntilDayReset } from '#src/containers/time-until-day-reset'
import { BuildsPreviewsWrap } from '#src/modules/builds/character-build-preview'

function Fieldset({ children, legend, classes = '' }) {
	return (
		<fieldset className={`my-2 ${classes}`}>
			<legend className="text-capitalize opacity-75 mb-2">{legend}</legend>
			{children}
		</fieldset>
	)
}
export function FrontPage(): JSX.Element {
	return (
		<div className="dashboard container ">
			<h1 className="my-1 letter-spacing-1">Dashboard</h1>
			<div className="row">
				<Fieldset legend="Region" classes="col-lg-3 col-12">
					<RegionSwitch />
				</Fieldset>
				<Fieldset legend="Until day reset" classes="col-lg-3 col-12">
					<TimeUntilDayReset classes="fs-4" />
				</Fieldset>
				<Fieldset legend="alchemy calculator" classes="col-lg-6 col-12 ">
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
