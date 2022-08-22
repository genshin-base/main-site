import { useCallback, useState } from 'preact/hooks'

import {
	I18N_C_MIHOYO,
	I18N_COPYRIGHTS,
	I18N_CREATED_BY_US,
	I18N_GI_MAP,
	I18N_GI_WIKI,
	I18N_HELPER_TEAM_TABLE,
	I18N_HONEY_IMPACT,
	I18N_NOT_AFFILIATED_WITH_MIHOYO,
	I18N_ORDER_SITE_FROM_US,
	I18N_REPORT_BUG,
	I18N_WE_USE_DATA_FROM,
} from '#src/i18n/i18n'
import { ReportBugModal } from '#src/modals/report-bug'
import {
	LINK_GI_MAP,
	LINK_GI_WIKI,
	LINK_GOOGLE_FORM_ORDER_SITE,
	LINK_HELPER_TEAM_TABLE,
	LINK_HONEY_IMPACT,
} from '#src/utils/links'

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
			<div className="container my-3">
				<div className="row pt-3 gy-3">
					<div className="col-12 col-md-3">
						<h5 className="opacity-75">Genshin Base</h5>
						<p className="small">
							<a
								role="button"
								className="link text-decoration-underline-dotted"
								onClick={onRepBugBtnClick}
							>
								{I18N_REPORT_BUG}
							</a>
							{isReportBugModalVisible && <ReportBugModal onClickAway={closeRepBugModal} />}
						</p>
						<p className="small  opacity-75">{I18N_CREATED_BY_US}</p>
						<p className="small">
							<a href={LINK_GOOGLE_FORM_ORDER_SITE} target="_blank">
								{I18N_ORDER_SITE_FROM_US}
							</a>
						</p>
					</div>
					<div className="col-12 col-md-4">
						<div className="ps-md-3">
							<h5 className="opacity-75">{I18N_WE_USE_DATA_FROM}</h5>
							<p>
								<a target="_blank" href={LINK_HELPER_TEAM_TABLE} className="text-muted small">
									{I18N_HELPER_TEAM_TABLE}
								</a>
							</p>
							<p>
								<a target="_blank" href={LINK_HONEY_IMPACT} className="text-muted small">
									{I18N_HONEY_IMPACT}
								</a>
							</p>
							<p>
								<a target="_blank" href={LINK_GI_MAP} className="text-muted small">
									{I18N_GI_MAP}
								</a>
							</p>
							<p>
								<a target="_blank" href={LINK_GI_WIKI} className="text-muted small">
									{I18N_GI_WIKI}
								</a>
							</p>
						</div>
					</div>
					<div className="col-12 col-md-4">
						<div className="ps-md-3 ">
							<h5 className="opacity-75">{I18N_COPYRIGHTS}</h5>
							<p className="small opacity-75">{I18N_C_MIHOYO}</p>
							<p className="small opacity-75">{I18N_NOT_AFFILIATED_WITH_MIHOYO}</p>
						</div>
					</div>
				</div>
			</div>
			<div style={{ 'text-align': 'right', 'font-size': '80%', opacity: '0.5' }}>
				{BUNDLE_ENV.VERSION.lastTag}{' '}
				<span style={{ opacity: '0.5' }}>{BUNDLE_ENV.VERSION.commitDate}</span>
			</div>
		</footer>
	)
}
