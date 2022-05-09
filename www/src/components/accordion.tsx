import { useState } from 'preact/hooks'

interface AccordionItem {
	code: string
	title: string
	content: JSX.Element
}
export function Accordion({
	classes = '',
	expandedItemCode,
	items,
}: {
	classes?: string
	expandedItemCode?: string
	items: AccordionItem[]
}): JSX.Element {
	const [expandedItemCodeLocal, setexpandedItemCode] = useState<string | undefined>(expandedItemCode)
	return (
		<div className={`accordion ${classes}`}>
			{items.map(ai => {
				const isThisExpanded = expandedItemCodeLocal === ai.code
				return (
					<div className="accordion-item">
						<h2 className="accordion-header">
							<button
								className={`accordion-button ${isThisExpanded ? '' : 'collapsed'}`}
								type="button"
								onClick={() => setexpandedItemCode(isThisExpanded ? undefined : ai.code)}
							>
								{ai.title}
							</button>
						</h2>
						{isThisExpanded ? (
							<div className={`accordion-collapse collapse show`}>
								<div className="accordion-body">{ai.content}</div>
							</div>
						) : null}
					</div>
				)
			})}
		</div>
	)
}
