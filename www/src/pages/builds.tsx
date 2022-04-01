import { useEffect } from 'preact/hooks'

import { useBuildWithDelayedLocs } from '#src/api'
import { Spinner } from '#src/components/spinners'
import { CharacterPicker } from '#src/containers/character-picker/character-picker'
import { FavoriteCharacters } from '#src/containers/character-picker/favorite-characters'
import {
	I18N_BASED_ON_GIHT,
	I18N_BUILD_RECS_FOR,
	I18N_CHAR_BUILD_RECS,
	I18N_LOADING,
	I18N_PAGE_TITLE_POSTFIX,
	I18N_RECOMENDED,
	I18N_SELECT_CHAR_ABOVE,
} from '#src/i18n/i18n'
import { CharacterBuildDetailed } from '#src/modules/builds/character-build-detailed'
import { isLoaded, useDocumentTitle } from '#src/utils/hooks'
import { LINK_HELPER_TEAM_TABLE } from '#src/utils/links'

export function BuildsPage_CharSelect(): JSX.Element {
	useDocumentTitle(I18N_CHAR_BUILD_RECS + I18N_PAGE_TITLE_POSTFIX)
	return (
		<div className="builds container">
			<h1 className="my-1 letter-spacing-1">{I18N_CHAR_BUILD_RECS}</h1>
			<h5 className="mt-2 mb-3 opacity-75">{I18N_SELECT_CHAR_ABOVE}</h5>
			<FavoriteCharacters navigateToCharacter={true} classes="mb-2" />
			<CharacterPicker />
		</div>
	)
}
export function BuildsPage_BuildDetail({ code }: { code: string }): JSX.Element {
	const [build, isUpdating] = useBuildWithDelayedLocs(code)
	useEffect(() => {
		window.scrollTo(0, 0)
	}, [])
	useDocumentTitle(
		isLoaded(build)
			? build.character.name + ' ' + I18N_BUILD_RECS_FOR + I18N_PAGE_TITLE_POSTFIX
			: I18N_LOADING + I18N_PAGE_TITLE_POSTFIX,
	)

	if (!isLoaded(build)) return <Spinner />

	return (
		<div className="builds container">
			<h1 className={`my-1 letter-spacing-1 ${BUNDLE_ENV.LANG === 'en' ? 'text-capitalize' : ''}`}>
				<span className="d-none d-xl-inline">{build.character.name}</span>
				<span className="d-xl-none">{I18N_RECOMENDED}</span> {I18N_BUILD_RECS_FOR}
			</h1>
			<FavoriteCharacters navigateToCharacter={true} selectedCharacterCode={code} />
			<CharacterBuildDetailed build={build} isUpdating={isUpdating} />
			<div className="col-lg-9 offset-lg-3 col-12">
				<a
					href={LINK_HELPER_TEAM_TABLE}
					target="_blank"
					className="fs-6 d-block my-3 text-center text-muted small"
				>
					{I18N_BASED_ON_GIHT}
				</a>
			</div>
		</div>
	)
}
