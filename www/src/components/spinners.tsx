export function Spinner(): JSX.Element {
	return (
		<div class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
	)
}
export function CentredSpinner(): JSX.Element {
	return (
		<div className="position-absolute top-0 bottom-0 start-0 end-0 d-flex justify-content-center align-items-center">
			<Spinner />
		</div>
	)
}
