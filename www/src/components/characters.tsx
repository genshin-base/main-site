import './characters.scss'

export function CharacterPortrait({ src, classes = '' }: { src: string; classes?: string }): JSX.Element {
	return <img className={`character-portrait ${classes}`} src={src} />
}
