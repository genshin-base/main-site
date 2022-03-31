import { I18N_CREATED_BY_US, I18N_ORDER_SITE_FROM_US, I18N_REPORT_BUG } from '#src/i18n/i18n'
import { ReportBugModal } from '#src/modals/report-bug'
import { LINK_GOOGLE_FORM_ORDER_SITE } from '#src/utils/links'
import { useCallback, useState } from 'preact/hooks'

export function Footer() {
	const [isReportBugModalVisible, setIsReportBugModalVisible] = useState<boolean>(false)
	const onRepBugBtnClick = useCallback(() => {
		setIsReportBugModalVisible(true)
	}, [setIsReportBugModalVisible])
	const closeRepBugModal = useCallback(() => {
		setIsReportBugModalVisible(false)
	}, [setIsReportBugModalVisible])
	return (
		<footer className="mt-auto bg-dark">
			<div className="container my-3 opacity-75">
				<div className="text-center mb-2">
					<button
						className="btn btn-link text-decoration-underline-dotted"
						onClick={onRepBugBtnClick}
					>
						{I18N_REPORT_BUG}
					</button>
					{isReportBugModalVisible && <ReportBugModal onClickAway={closeRepBugModal} />}
				</div>
				<div className="text-center">{I18N_CREATED_BY_US}</div>
				<div className="text-center">
					<a href={LINK_GOOGLE_FORM_ORDER_SITE} target="_blank">
						{I18N_ORDER_SITE_FROM_US}
					</a>
				</div>
			</div>
		</footer>
	)
}
