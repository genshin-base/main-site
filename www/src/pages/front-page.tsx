import { Greetings } from '#src/components/greetings'
import { FarmToday } from '#src/containers/farm-today'
import { TimeUntilDayReset } from '#src/containers/time-until-day-reset'
import {
	I18N_BUILDS,
	I18N_DASHBOARD,
	I18N_FRONT_PAGE_DESCRIPTION,
	I18N_PAGE_TITLE_POSTFIX,
	I18N_UNTIL_DAY_RESET,
	I18N_WHAT_TO_FARM,
} from '#src/i18n/i18n'
import { BuildsPreviewsWrap } from '#src/modules/builds/character-build-preview'
import { useDocumentTitle, usePageDescription } from '#src/utils/hooks'

function Fieldset({ children, legend, classes = '' }) {
	return (
		<fieldset className={`my-2 py-2 main-bg fw-bold ${classes}`}>
			<legend className="mb-2 ">{legend}</legend>
			{children}
		</fieldset>
	)
}
export function FrontPage(): JSX.Element {
	useDocumentTitle(I18N_DASHBOARD + I18N_PAGE_TITLE_POSTFIX)

	usePageDescription(() => I18N_FRONT_PAGE_DESCRIPTION)

	return (
		<div className="dashboard container ">
			<Greetings classes="mb-4 mt-2" isHiddenOnMobile={true} isClosable={true} />
			<h1 className="my-1 letter-spacing-1">{I18N_DASHBOARD}</h1>
			<div className="row">
				<Fieldset legend={I18N_UNTIL_DAY_RESET} classes="col-lg-6 col-12">
					<TimeUntilDayReset classes="opacity-75" />
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
