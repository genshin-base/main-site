import { AlchemyCalculator } from '#src/containers/alchemy-calculator'
import { BuildsPreviewsWrap } from '#src/modules/builds/build-preview'

export function FrontPage() {
	return (
		<div className="dashboard container">
			<h1 className="my-1">Dashboard</h1>
			<div className="row">
				<AlchemyCalculator />
			</div>
			<div className="row">
				<BuildsPreviewsWrap classes="col-lg-6 col-12" />
			</div>
		</div>
	)
}
