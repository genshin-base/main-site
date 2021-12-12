export default function Spinner(): JSX.Element {
	return (
		<div class="d-flex justify-content-center">
			<div class="spinner-border" role="status">
				<span class="visually-hidden">Loading...</span>
			</div>
		</div>
	)
}
