import { useCallback, useMemo, useState } from 'preact/hooks'

import { apiGetSearchData } from '#src/api/endpoints'
import { isLoaded, useFetch } from '#src/utils/hooks'

import './mega-search.scss'

export function MegaSearch({ classes = '' }: { classes?: string }): JSX.Element {
	const searchData = useFetch(apiGetSearchData, [])
	const [searchStr, setSearchStr] = useState<string>('')

	const searchResult = useMemo(() => {
		if (!isLoaded(searchData)) return searchData
		const strLC = searchStr.trim().toLocaleLowerCase()
		if (searchStr === '') return []
		return searchData.filter(
			x => x.name.toLocaleLowerCase().includes(strLC) || x.nameEn?.toLocaleLowerCase().includes(strLC),
		)
	}, [searchData, searchStr])

	const onSearchValueChange = useCallback(e => setSearchStr(e.target.value), [setSearchStr])
	return (
		<div className={`mega-search ${classes}`}>
			<input type="search" value={searchStr} onInput={onSearchValueChange} />
			<div className="search-results-dd">
				{isLoaded(searchResult)
					? searchResult.map(x => (
							<div>
								{x.type}:{x.code}
							</div>
					  ))
					: 'луадинг...'}
			</div>
		</div>
	)
}
