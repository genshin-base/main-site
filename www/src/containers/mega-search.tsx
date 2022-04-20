// import { useCallback, useMemo, useState } from 'preact/hooks'

// import { apiGetSearchData } from '#src/api/endpoints'
// import { isLoaded, useFetch } from '#src/utils/hooks'

// import './mega-search.scss'

// export function MegaSearch({ classes = '' }: { classes?: string }): JSX.Element {
// 	const searchData = useFetch(apiGetSearchData, [])
// 	const [searchStr, setSearchStr] = useState<string>('')

// 	const searchResult = useMemo(() => {
// 		if (!isLoaded(searchData)) return searchData
// 		const strLC = searchStr.trim().toLocaleLowerCase()
// 		if (searchStr === '') return []
// 		return searchData.filter(
// 			x => x.name.toLocaleLowerCase().includes(strLC) || x.nameEn?.toLocaleLowerCase().includes(strLC),
// 		)
// 	}, [searchData, searchStr])

// 	const onSearchValueChange = useCallback(e => setSearchStr(e.target.value), [setSearchStr])
// 	return (
// 		<div className={`mega-search ${classes}`}>
// 			<input type="search" value={searchStr} onInput={onSearchValueChange} />
// 			<div className="search-results-dd">
// 				{isLoaded(searchResult)
// 					? searchResult.map(x => (
// 							<div>
// 								{x.type}:{x.code}
// 							</div>
// 					  ))
// 					: 'луадинг...'}
// 			</div>
// 		</div>
// 	)
// }
import { SearchItem } from '#src/../../lib/parsing/combine'
import { apiGetSearchData } from '#src/api/endpoints'
import { CentredSpinner } from '#src/components/placeholders'
import { I18N_NOTHING_TO_SHOW } from '#src/i18n/i18n'
import { A } from '#src/routes/router'
import { getArtifactIconSrc } from '#src/utils/artifacts'
import { calcPosForDd } from '#src/utils/calc-pos-for-dd'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { MODALS_EL } from '#src/utils/dom'
import { isLoaded, useFetch, useWindowSize } from '#src/utils/hooks'
import { createPortal } from '#src/utils/preact-compat'
import { getWeaponIconSrc } from '#src/utils/weapons'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'
import { ItemAvatar } from './item-cards/item-avatars'
import './mega-search.scss'

function getIconForItem({ code, type }) {
	return {
		character: getCharacterAvatarSrc,
		weapon: getWeaponIconSrc,
		artifact: getArtifactIconSrc,
	}[type](code)
}
function searchInItem(item: SearchItem, searchStr: string): boolean {
	return (
		item.name.toLowerCase().includes(searchStr) ||
		(item.nameEn ? item.nameEn.toLowerCase().includes(searchStr) : false)
	)
}
export function MegaSearch({ classes = '' }: { classes?: string }): JSX.Element {
	const [searchStr, setSearchStr] = useState<string>('')
	const searchData = useFetch(apiGetSearchData, [])

	const ddRef = useRef<HTMLDivElement>(null)
	const targetRef = useRef<HTMLInputElement>(null)
	const onResize = useCallback(() => {
		if (!ddRef.current) return
		if (!targetRef.current) return
		const ddEl = ddRef.current
		const targetEl = targetRef.current
		const pos = calcPosForDd(targetEl.getBoundingClientRect(), ddEl.getBoundingClientRect(), {
			isAbsolute: true,
		})
		ddEl.style.left = `${Math.max(0, pos.left)}px`
		ddEl.style.top = `${Math.max(0, pos.top)}px`
	}, [ddRef, targetRef])
	const results = useMemo<SearchItem[]>(() => {
		if (!isLoaded(searchData)) return []
		return searchStr ? searchData.filter(it => searchInItem(it, searchStr)) : []
	}, [searchStr, searchData])
	useEffect(() => onResize(), [results, onResize])
	const onSearchValueChange = useCallback(e => setSearchStr(e.target.value), [setSearchStr])
	useLayoutEffect(onResize)
	useWindowSize()

	return (
		<div className={`mega-search position-relative d-inline-block ${classes}`}>
			<input
				className="rounded border bg-dark text-light border-secondary"
				type="search"
				value={searchStr}
				onInput={onSearchValueChange}
				disabled={!isLoaded(searchData)}
				ref={targetRef}
			/>
			{!isLoaded(searchData) ? <CentredSpinner /> : null}
			{searchStr &&
				createPortal(
					<div className="card search-results-dd overflow-auto position-absolute" ref={ddRef}>
						<div className="card-body p-2">
							{results.length ? (
								results.map(item => <SearchItemCard key={item.code} item={item} />)
							) : (
								<div className="text-center text-muted fst-italic small">
									{I18N_NOTHING_TO_SHOW}
								</div>
							)}
						</div>
					</div>,
					MODALS_EL,
				)}
		</div>
	)
}

function SearchItemCard({ item }: { item: SearchItem }): JSX.Element {
	//todo links
	return (
		<div className="small lh-sm d-flex">
			<div>
				<ItemAvatar src={getIconForItem(item)} href={``} />
			</div>
			<div>
				<h6 className="mb-0">{item.name}</h6>
				<div className="text-muted">{item.nameEn}</div>
				{item.type === 'weapon' && <A href={`/equipment/`}>item detail</A>}
				{item.type === 'artifact' && <A href={`/equipment/`}>item detail</A>}
				{item.type === 'character' && <A href={`/builds/${item.code}`}>recomended builds</A>}
			</div>
		</div>
	)
}
