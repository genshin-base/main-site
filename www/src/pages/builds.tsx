import { useBuildWithDelayedLocs } from '#src/api'
import { Spinner } from '#src/components/spinners'
import { CharacterPicker } from '#src/containers/character-picker/character-picker'
import { FavoriteCharacters } from '#src/containers/character-picker/favorite-characters'
import { CharacterBuildDetailed } from '#src/modules/builds/character-build-detailed'
import { isLoaded } from '#src/utils/hooks'
import { useEffect } from 'preact/hooks'

export function BuildsPage_CharSelect(): JSX.Element {
	return (
		<div className="builds container">
			<h1 className="my-1 letter-spacing-1">Character builds recomendations</h1>
			<h5 className="mt-2 mb-3 opacity-75">Select character above</h5>
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
				<span className="d-none d-xl-inline">{build.character.name}</span> build recomendations
			</h1>
			<FavoriteCharacters navigateToCharacter={true} />
			<CharacterBuildDetailed build={build} isUpdating={isUpdating} />
			<a
				href="https://docs.google.com/spreadsheets/d/1gNxZ2xab1J6o1TuNVWMeLOZ7TPOqrsf3SshP5DLvKzI/pubhtml#"
				className="fs-6 d-block my-3 text-muted"
			>
				Based on Genshin Impact Helper Team's Character Builds
			</a>
		</div>
	)
}
