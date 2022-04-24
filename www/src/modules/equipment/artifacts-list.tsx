import { apiGetArtifacts } from '#src/api/endpoints'
import { MobileDesktopSwitch } from '#src/components/mobile-desc-switch'
import { Spinner } from '#src/components/placeholders'
import {
	ArtifactCardTableRow,
	ARTIFACT_ROW_CARD_HASH_KEY,
} from '#src/containers/item-cards/line-cards/artifact-card'
import { I18N_NAME, I18N_PIECES_BONUS, I18N_PIECE_BONUS } from '#src/i18n/i18n'
import { isLoaded, useFetch, useHashValue } from '#src/utils/hooks'
import { useMemo } from 'preact/hooks'

export function ArtifactsList(): JSX.Element {
	const artifacts = useFetch(apiGetArtifacts, [])
	const [selectedArtifactCode] = useHashValue(ARTIFACT_ROW_CARD_HASH_KEY, null)

	const artifactsSorted = useMemo(() => {
		if (!isLoaded(artifacts)) return []
		const artifactsLocal = [...artifacts]
		artifactsLocal.sort((a, b) => b.rarity - a.rarity)
		return artifactsLocal
	}, [artifacts])
	if (!isLoaded(artifacts)) return <Spinner />
	return (
		<>
			<table className="table table-sm">
				<thead className="bg-dark">
					<tr>
						<th scope="col">{I18N_NAME}</th>
						<th scope="col">{I18N_PIECES_BONUS(4)}</th>
						<MobileDesktopSwitch
							childrenDesktop={
								<>
									<th scope="col">{I18N_PIECES_BONUS(2)}</th>
									<th scope="col">{I18N_PIECE_BONUS(1)}</th>
								</>
							}
							childrenMobile={null}
						/>
						<th scope="col"></th>
					</tr>
				</thead>
				<tbody>
					{isLoaded(artifacts)
						? artifactsSorted.map((a, i) => (
								<ArtifactCardTableRow
									artifact={a}
									key={a.code}
									group={i % 2}
									isExpanded={a.code === selectedArtifactCode}
								/>
						  ))
						: null}
				</tbody>
			</table>
		</>
	)
}
