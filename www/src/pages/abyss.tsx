import { BlockHeader } from '#src/components/block-header'
import { CharListWithUsage } from '#src/containers/recommended-teams'
import { I18N_ABOUT_SITE, I18N_PAGE_TITLE_POSTFIX } from '#src/i18n/i18n'
import { useDocumentTitle } from '#src/utils/hooks'

import './abyss.scss'

export function AbyssPage(): JSX.Element {
	useDocumentTitle('статистика бездны' + I18N_PAGE_TITLE_POSTFIX)
	return (
		<div className="abyss container">
			<div class="position-relative overflow-hidden rounded-3 py-4 px-md-5 px-4 my-4 please">
				<div className="please-bg"></div>
				<p className="fs-3 text-center please-text">
					Help us to collect data about characters usage in Abyss
				</p>
				<p className="fs-5 text-center">
					Just leave your UID here and check if your battle history public
				</p>
				<div className="d-flex">
					<input
						placeholder="Your game ID or Hoyolab ID"
						className="form-control form-control-lg bg-dark text-light border-secondary"
					/>
					<button className="btn btn-danger btn-lg ms-2">Submit</button>
				</div>
				<div className="mt-4 mb-3 px-2">
					<div className="text-center mb-2 please-text">
						<label>Please share this page, so we can faster finish data collection.</label>
					</div>
					<div class="progress ">
						<div
							class="progress-bar"
							role="progressbar"
							style={{ width: '24%', backgroundColor: 'rgb(94, 84, 139)' }}
							aria-valuemin="0"
							aria-valuemax="100"
						>
							240 UIDs from 1000 collected
						</div>
					</div>
					<div className="text-center mt-4 please-text">
						<label>
							If you want to know when statistics will be ready, join{' '}
							<a href="#" className="link-danger">
								our Discord
							</a>{' '}
							or follow us on{' '}
							<a href="#" className="link-danger">
								Telegram
							</a>
						</label>
					</div>
				</div>
			</div>
			<h1 className="my-1 letter-spacing-1">{'Abyss statistics'}</h1>
			<label className="text-muted">This is sample data: actual for v2.7</label>
			<div className="row">
				<div className="col-12 col-lg-3">
					<BlockHeader classes="mt-3">{'Most used characters'}</BlockHeader>
					<CharListWithUsage classes="col-s-content" />
				</div>
				<div className="col-12 col-lg-9">
					<BlockHeader classes="mt-3">{'History of character usage'}</BlockHeader>
					<div className="position-relative col-e-content">
						{/* <img style={{ size: 'cover' }} src="https://i.imgur.com/j1gVE7h.png"></img> */}
						<iframe style={{ height: '100%', width: '100%' }} src="/c/index.html"></iframe>
						<div className="pe-none position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center">
							{'example of data'}
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}