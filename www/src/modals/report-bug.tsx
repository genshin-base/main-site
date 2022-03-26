import { sendMessage } from '#src/errors/rollbar'
import {
	I18N_CANCEL,
	I18N_REPORT_BUG,
	I18N_REPORT_BUG_GUIDE,
	I18N_SUBMIT,
	I18N_SUBMIT_BUG_ERROR,
	I18N_SUBMIT_BUG_SUCCESS,
	I18N_YOUR_MESSAGE_HERE,
} from '#src/i18n/i18n'
import { useClickAway } from '#src/utils/hooks'
import { createPortal } from '#src/utils/preact-compat'
import { useCallback, useRef, useState } from 'preact/hooks'

let modalsEl: Element | null = null

export const ReportBugModal = ({ onClickAway }: { onClickAway(): void }): JSX.Element => {
	const [message, setMessage] = useState<string>('')
	const [isInvalid, setIsInvalid] = useState<boolean>(false)
	const onMessageChange = useCallback(
		e => {
			setMessage(e.target.value)
			isInvalid && setIsInvalid(false)
		},
		[setMessage, isInvalid, setIsInvalid],
	)
	modalsEl ??= document.querySelector('.modals') as Element
	const modalRef: preact.RefObject<HTMLDivElement> | null = useRef(null)
	useClickAway(modalRef, onClickAway)
	const tryToSendMessage = useCallback(() => {
		if (!message.length) return setIsInvalid(true)
		sendMessage('message from bug report modal: ' + message)
			.then(() => alert(I18N_SUBMIT_BUG_SUCCESS))
			.catch(() => alert(I18N_SUBMIT_BUG_ERROR))
			.finally(() => {
				onClickAway()
			})
	}, [message, onClickAway, setIsInvalid])
	return createPortal(
		<>
			<div className="modal-backdrop show d-block"></div>
			<div
				className="modal d-block"
				id="exampleModal"
				tab-index="-1"
				aria-labelledby="exampleModalLabel"
				aria-hidden="true"
			>
				<div className="modal-dialog modal-dialog-scrollable" ref={modalRef}>
					<div className="modal-content">
						<div className="modal-header">
							<h5 className="modal-title" id="exampleModalLabel">
								{I18N_REPORT_BUG}
							</h5>
							<button
								type="button"
								className="btn-close btn-sm"
								aria-label="Close"
								onClick={onClickAway}
							></button>
						</div>
						<div className="modal-body">
							<div className="text-muted">{I18N_REPORT_BUG_GUIDE}</div>
							<textarea
								value={message}
								placeholder={I18N_YOUR_MESSAGE_HERE}
								rows={5}
								className={`w-100 bg-light border ${
									isInvalid ? 'border-2 border-danger' : 'border-light'
								} rounded`}
								onInput={onMessageChange}
							></textarea>
						</div>
						<div className="modal-footer">
							<button
								type="button"
								className="btn btn-link text-decoration-none text-capitalize"
								onClick={onClickAway}
							>
								{I18N_CANCEL}
							</button>
							<button
								type="button"
								className="btn btn-primary text-capitalize"
								onClick={tryToSendMessage}
							>
								{I18N_SUBMIT}
							</button>
						</div>
					</div>
				</div>
			</div>
		</>,
		modalsEl,
	)
}
