import { I18N_CREATED_BY_US } from '#src/i18n/i18n'

export function Footer() {
	return (
		<footer className="mt-auto bg-dark">
			<div className="container my-3 opacity-75">
				<div className="text-center">{I18N_CREATED_BY_US}</div>
			</div>
		</footer>
	)
}
