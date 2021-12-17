function Card({
	classes = '',
	titleEl,
	bodyEl,
	insideEl,
}: {
	classes?: string
	titleEl: JSX.Nodes | string
	bodyEl?: JSX.Nodes
	insideEl?: JSX.Nodes
}): JSX.Element {
	return (
		<div className={`card mvh-50 ${classes}`}>
			<h3 className="card-header fs-4">{titleEl}</h3>
			<div className="card-body overflow-auto flex-shrink-1">{bodyEl}</div>
			{insideEl}
		</div>
	)
}
const bonus2 = 'Повышает бонус лечения на 15%.'
const bonus4 =
	'Экипированный этим набором артефактов персонаж при лечении соратников создаёт на 3 сек. Пузырь морских красок. Пузырь регистрирует восстановленное при лечении HP (в том числе избыточные, когда лечение превышает максимум здоровья). После окончания действия Пузырь взрывается и наносит окружающим врагам урон в размере 90% учтённого объёма лечения (урон рассчитывается так же, как для эффектов Заряжен и Сверхпроводник, но на него не действуют бонусы мастерства стихий, уровня и реакций). Пузырь морских красок можно создавать не чаще, чем раз в 3,5 сек. Пузырь может записать до 30 000 восстановленных HP, в том числе HP избыточного лечения. Для отряда не может существовать больше одного Пузыря морских красок одновременно. Этот эффект действует, даже если персонаж, экипированный набором артефактов, не находится на поле боя.'
export function ArtifactCard({ classes = '' }: { classes?: string }): JSX.Element {
	return (
		<Card
			titleEl={'Неприлично длинное название сета'}
			bodyEl={
				<div className="">
					<h6 className="text-uppercase opacity-75">2 pieces bonus</h6>
					<div className="mb-3">{bonus2}</div>
					<h6 className="text-uppercase opacity-75">4 pieces bonus</h6>
					<div>{bonus4}</div>
				</div>
			}
			insideEl={
				<img
					className="my-3 dungeon-location"
					src="https://cs10.pikabu.ru/post_img/2019/11/30/12/15751468251132348.jpg"
				></img>
			}
		></Card>
	)
}
