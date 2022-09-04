import { useCallback, useMemo, useState } from 'preact/hooks'

import { apiGetAbyssStats } from '#src/api/endpoints'
import { CentredSpinner } from '#src/components/placeholders'
import { Tooltip } from '#src/components/tooltip'
import { I18N_NOTHING_TO_SHOW, I18N_USED_IN_ABYSS } from '#src/i18n/i18n'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { generateColor } from '#src/utils/color-gradient'
import { isLoaded, useFetch, useHover } from '#src/utils/hooks'
import { CharacterAvatar, ItemAvatar, LabeledItemAvatar } from './item-cards/item-avatars'

export function RecommendedTeams({ characterCode }: { characterCode: string }): JSX.Element {
	const abyssStats = useFetch(apiGetAbyssStats, [])

	const teamsList = useMemo(() => {
		if (!isLoaded(abyssStats)) return
		const charCodeLocal = characterCode.includes('traveler') ? 'traveler' : characterCode
		const teamsData = abyssStats.mostUsedTeams.filter(t => t.codes.includes(charCodeLocal))
		teamsData.forEach(t => {
			t.codes.sort((a, b) => {
				return b.localeCompare(a)
			})
			t.codes.sort((a, b) => {
				return a === charCodeLocal ? -1 : 0
			})
		})
		return teamsData.slice(0, Math.min(20, teamsData.length))
	}, [abyssStats, characterCode])
	// console.log(teamsList)
	return (
		<div class="recommended-teams position-relative">
			{teamsList?.map(t => (
				<Team teamData={t} />
			))}
			{!isLoaded(abyssStats) ? <CentredSpinner /> : null}
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
										// 	~favCharCodes.indexOf(c) ? <span className="text-danger">{HEART}</span> : null
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
const spectrum = generateColor('#5c568d', '#e41448', 100)
const getLetters = percent => {
	if (percent > 90) return 'SSS'
	if (percent > 80) return 'SS'
	if (percent > 60) return 'S'
	if (percent > 40) return 'A'
	if (percent > 20) return 'B'
	if (percent > 10) return 'C'
	if (percent > 1) return 'D'
	return 'F'
}
export function CharacterRating({ characterCode }: { characterCode: string }): JSX.Element {
	const abyssStats = useFetch(apiGetAbyssStats, [])
	const [elRef, isHovered] = useHover<HTMLDivElement>()
	const stats = useMemo(() => {
		if (!isLoaded(abyssStats)) return {}
		const charCodeLocal = characterCode.includes('traveler') ? 'traveler' : characterCode
		const charData = abyssStats.mostUsedCharacters.find(d => d.code === charCodeLocal)
		const percent = (charData ? charData.use : 0) * 100
		const percentRound = Math.round(Math.max(percent, 1))
		return {
			letters: getLetters(percentRound),
			percent,
			width: percent + '%',
			color: spectrum[percentRound],
		}
	}, [abyssStats, characterCode])
	return (
		<div class="character-rating position-relative mt-n4">
			{!isLoaded(abyssStats) ? <CentredSpinner /> : null}
			<div className="d-flex flex-row-reverse" style={{ color: stats.color || '' }}>
				<div class="d-flex align-items-center c-help" ref={elRef}>
					<span class="badge rounded-pill bg-secondary me-1 opacity-75">?</span>
					<span class="fs-3 fst-italic" ref={elRef}>
						{stats.letters}
					</span>
				</div>
			</div>
			{elRef.current && isHovered ? (
				<Tooltip targetEl={elRef.current}>{I18N_USED_IN_ABYSS(stats.percent || 0)}</Tooltip>
			) : null}
			<div class="progress">
				<div
					class="progress-bar"
					role="progressbar"
					style={{ width: stats.width, backgroundColor: stats.color }}
					aria-valuenow={stats.percent}
					aria-valuemin="0"
					aria-valuemax="100"
				></div>
			</div>
		</div>
	)
}

export const CharListWithUsage = ({ classes = '' }: { classes: string }) => {
	const abyssStats = useFetch(apiGetAbyssStats, [])
	const [searchStr, setSearchStr] = useState('')
	const setSearchStrLocal = useCallback(e => setSearchStr(e.target.value), [setSearchStr])
	console.log(searchStr)
	const charStats = useMemo(() => {
		if (!isLoaded(abyssStats)) return []
		return abyssStats.mostUsedCharacters
			.filter(charData => (searchStr ? charData.code.includes(searchStr) : true))
			.map(charData => {
				const percent = charData.use * 100
				const percentRound = Math.round(Math.max(percent, 1))
				return {
					code: charData.code,
					letters: getLetters(percent),
					color: spectrum[percentRound],
				}
			})
	}, [abyssStats, searchStr])

	return (
		<div className={`position-relative d-flex flex-column flex-grow-1 overflow-hidden ${classes}`}>
			<input
				type="search"
				placeholder="Search"
				className="form-control form-control-sm bg-dark text-light border-secondary mt-3 mb-2"
				value={searchStr}
				onInput={setSearchStrLocal}
			/>
			{!isLoaded(abyssStats) ? (
				<CentredSpinner />
			) : (
				<div className="pe-2 overflow-auto flex-grow-1">
					{!charStats.length && (
						<div className="text-center text-muted">
							<i>{I18N_NOTHING_TO_SHOW}</i>
						</div>
					)}
					{charStats.map(chs => (
						<div
							key={chs.code}
							className="d-flex align-items-center justify-content-between my-2"
						>
							<div className="d-flex align-items-center">
								<ItemAvatar
									src={getCharacterAvatarSrc(chs.code)}
									classes=""
									href={'/builds/' + chs.code}
								/>
								<span className="ms-2">{chs.code}</span>
							</div>
							<span style={{ color: chs.color }} className="fs-4 fst-italic">
								{chs.letters}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
