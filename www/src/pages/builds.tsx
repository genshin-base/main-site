import { useBuildWithDelayedLocs } from '#src/api'
import { Spinner } from '#src/components/spinners'
import { CharacterPicker } from '#src/containers/character-picker/character-picker'
import { FavoriteCharacters } from '#src/containers/character-picker/favorite-characters'
import {
	I18N_BASED_ON_GIHT,
	I18N_BUILD_RECS_FOR,
	I18N_CHAR_BUILD_RECS,
	I18N_SELECT_CHAR_ABOVE,
} from '#src/i18n/i18n'
import { CharacterBuildDetailed } from '#src/modules/builds/character-build-detailed'
import { isLoaded } from '#src/utils/hooks'
import { useEffect } from 'preact/hooks'

export function BuildsPage_CharSelect(): JSX.Element {
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
	if (!isLoaded(build)) return <Spinner />
	return (
		<div className="builds container">
			<h1 className={`my-1 letter-spacing-1 ${BUNDLE_ENV.LANG === 'en' ? 'text-capitalize' : ''}`}>
				<span className="d-none d-xl-inline">{build.character.name}</span> {I18N_BUILD_RECS_FOR}
			</h1>
			<FavoriteCharacters navigateToCharacter={true} />
			<CharacterBuildDetailed build={build} isUpdating={isUpdating} />
			<div className="col-lg-9 offset-lg-3 col-12">
				<a
					href="https://docs.google.com/spreadsheets/d/1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI/pubhtml#"
					className="fs-6 d-block my-3 text-center text-muted small"
				>
					{I18N_BASED_ON_GIHT}
				</a>
			</div>
		</div>
	)
}
