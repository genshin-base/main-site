import { CharacterAvatar } from './item-cards/item-avatars'

export function RecommendedTeams({ characterCode }: { characterCode: string }): JSX.Element {
	// const abyssStats = useFetch(apiGetAbyssStats, [])

	// console.log(teamsList)
	return (
		<div class="recommended-teams position-relative">
			{/* {teamsList?.map(t => (
				<Team teamData={t} />
			))}
			{!isLoaded(abyssStats) ? <CentredSpinner /> : null} */}
		</div>
	)
}
function Team({ teamData }: { teamData: { codes: string[]; use: number } }): JSX.Element {
	return (
		<table>
			<tbody>
				<tr>
					<td>
						<div class="flex-fill d-flex align-items-center justify-content-between me-2">
							{teamData.codes.map((c, i) => (
								<>
									<CharacterAvatar
										key={c}
										code={c}
										classes={``}
										// rarity={isAvatarWithBorder ? 4 : undefined}
										// isNoBg={!navigateToCharacter}
										// href={navigateToCharacter ? '/builds/' + c : undefined}
										// badgeTopStart={
										// 	~favCharCodes.indexOf(c) ? <span className="text-danger opacity-75">{HEART}</span> : null
										// }
									/>
									{i < teamData.codes.length - 1 ? (
										<span class="text-muted ms-1 me-1">+</span>
									) : null}
								</>
							))}
						</div>
					</td>
					<td class="text-end">
						<div>{Math.round(teamData.use * 100)} %</div>
					</td>
				</tr>
			</tbody>
		</table>
	)
}
