import { AlchemyCalculator } from '#src/containers/alchemy-calculator'
import { FarmToday } from '#src/containers/farm-today'
import { RegionSwitch } from '#src/containers/region-switch'
import { TimeUntilDayReset } from '#src/containers/time-until-day-reset'
import {
	I18N_ALCHEMY_CALC,
	I18N_BUILDS,
	I18N_DASHBOARD,
	I18N_FRONT_PAGE_DESCRIPTION,
	I18N_PAGE_TITLE_POSTFIX,
	I18N_REGION,
	I18N_UNTIL_DAY_RESET,
	I18N_WHAT_TO_FARM,
} from '#src/i18n/i18n'
import { BuildsPreviewsWrap } from '#src/modules/builds/character-build-preview'
import { useDocumentTitle, usePageDescription } from '#src/utils/hooks'

function Fieldset({ children, legend, classes = '' }) {
	return (
		<fieldset className={`my-2 ${classes}`}>
			<legend className="opacity-75 mb-2">{legend}</legend>
			{children}
		</fieldset>
	)
}
export function FrontPage(): JSX.Element {
	useDocumentTitle(I18N_DASHBOARD + I18N_PAGE_TITLE_POSTFIX)

	usePageDescription(() => I18N_FRONT_PAGE_DESCRIPTION)

	return (
		<div className="dashboard container ">
			<h1 className="my-1 letter-spacing-1">{I18N_DASHBOARD}</h1>
			<div className="row">
				<Fieldset legend={I18N_REGION} classes="col-lg-3 col-12">
					<RegionSwitch />
				</Fieldset>
				<Fieldset legend={I18N_UNTIL_DAY_RESET} classes="col-lg-3 col-12">
					<TimeUntilDayReset classes="fs-4" />
				</Fieldset>
				<Fieldset legend={I18N_ALCHEMY_CALC} classes="col-lg-6 col-12 ">
					<AlchemyCalculator />
				</Fieldset>
			</div>
			<div className="row">
				<Fieldset classes="col-lg-6 col-12" legend={I18N_WHAT_TO_FARM}>
					<FarmToday />
				</Fieldset>
				<Fieldset classes="col-lg-6 col-12" legend={I18N_BUILDS}>
					<BuildsPreviewsWrap />
				</Fieldset>
			</div>
		</div>
	)
}
