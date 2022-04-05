import { useCallback, useState } from 'preact/hooks'
import './mega-search.scss'

export function MegaSearch({ classes = '' }: { classes?: string }): JSX.Element {
	const [searchStr, setSearchStr] = useState<string>('')
	const [results, setResults] = useState([])

	const onSearchValueChange = useCallback(e => setSearchStr(e.target.value), [setSearchStr])
	return (
		<div className={`mega-search ${classes}`}>
			<input type="search" value={searchStr} onInput={onSearchValueChange} />
			<div className="search-results-dd"></div>
		</div>
	)
}
