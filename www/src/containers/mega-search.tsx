import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'

import { SearchItem } from '#src/../../lib/parsing/combine'
import { apiGetSearchData } from '#src/api/endpoints'
import { CentredLabel, CentredSpinner } from '#src/components/placeholders'
import {
	I18N_ARTIFACTS,
	I18N_CHARACTERS,
	I18N_MEGA_SEARCH_PLACEHOLDER,
	I18N_NOTHING_TO_SHOW,
	I18N_WEAPONS,
} from '#src/i18n/i18n'
import { A } from '#src/routes/router'
import { getArtifactIconSrc } from '#src/utils/artifacts'
import { calcPosForDd } from '#src/utils/calc-pos-for-dd'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { GET_MODALS_EL, stopPropagation } from '#src/utils/dom'
import { isLoaded, useClickAway, useFetch, useWindowSize } from '#src/utils/hooks'
import { createPortal } from '#src/utils/preact-compat'
import { getWeaponIconSrc } from '#src/utils/weapons'
import { ItemAvatar } from './item-cards/item-avatars'

import './mega-search.scss'
import { BlockHeader } from '#src/components/block-header'
import { genEquipmentHash } from '#src/modules/equipment/common'
interface MegaSearch_SearchItem extends SearchItem {
	nameLC: string
	nameEnLC?: string
}
type SearchResults = {
	weapon: MegaSearch_SearchItem[]
	character: MegaSearch_SearchItem[]
	artifact: MegaSearch_SearchItem[]
} | null
function getIconForItem({ code, type }) {
	return {
		character: getCharacterAvatarSrc,
		weapon: getWeaponIconSrc,
		artifact: getArtifactIconSrc,
	}[type](code)
}
function searchInItem(item: MegaSearch_SearchItem, searchStr: string): boolean {
	const searchStrLocal = searchStr.toLowerCase()
	return (
		item.nameLC.includes(searchStrLocal) ||
		(item.nameEnLC ? item.nameEnLC.includes(searchStrLocal) : false)
	)
}
function sortInItem(item: MegaSearch_SearchItem, searchStr: string): number {
	const searchStrLocal = searchStr.toLowerCase()
	return Math.min(
		item.nameLC.indexOf(searchStrLocal),
		item.nameEnLC ? item.nameEnLC.indexOf(searchStrLocal) : 999,
	)
}
const itemTypes = ['character', 'weapon', 'artifact']
export function MegaSearch({ classes = '' }: { classes?: string }): JSX.Element {
	const [searchStr, setSearchStr] = useState<string>('')
	const searchData = useFetch(apiGetSearchData, [])

	const searchDataGrouped: SearchResults = useMemo(() => {
		if (!isLoaded(searchData)) {
			return { character: [], weapon: [], artifact: [] }
		} else {
			const searchDataLocal: SearchResults = { weapon: [], character: [], artifact: [] }
			searchData.forEach((si: SearchItem) => {
				return itemTypes.forEach(
					k =>
						si.type === k &&
						searchDataLocal[k].push({
							...si,
							nameLC: si.name.toLowerCase(),
							nameEnLC: si.nameEn?.toLowerCase(),
						}),
				)
			})
			return searchDataLocal
		}
	}, [searchData])

	const clearSearch = useCallback(() => {
		setSearchStr('')
	}, [setSearchStr])

	const ddRef = useRef<HTMLDivElement>(null)
	const targetRef = useRef<HTMLInputElement>(null)

	useClickAway([targetRef, ddRef], clearSearch)

	const onResize = useCallback(() => {
		if (!ddRef.current) return
		if (!targetRef.current) return
		const ddEl = ddRef.current
		const targetEl = targetRef.current
		const pos = calcPosForDd(targetEl.getBoundingClientRect(), ddEl.getBoundingClientRect(), {
			isAbsolute: true,
			isCentered: true,
		})
		ddEl.style.left = `${Math.max(0, pos.left)}px`
		ddEl.style.top = `${Math.max(0, pos.top)}px`
	}, [ddRef, targetRef])

	const searchResults = useMemo<SearchResults>(() => {
		if (!isLoaded(searchData) || !searchStr) return null
		const searchResultsLocal = { character: [], weapon: [], artifact: [] }
		itemTypes.forEach(t => {
			searchResultsLocal[t] = searchStr
				? searchDataGrouped[t].filter((it: MegaSearch_SearchItem) => searchInItem(it, searchStr))
				: []
			searchResultsLocal[t].sort((a, b) => sortInItem(b, searchStr) - sortInItem(a, searchStr))
		})
		return searchResultsLocal
	}, [searchStr, searchDataGrouped, searchData])

	useEffect(() => onResize(), [searchResults, onResize])
	const onSearchValueChange = useCallback(e => setSearchStr(e.target.value), [setSearchStr])
	useLayoutEffect(onResize)
	useWindowSize()

	return (
		<div className={`mega-search position-relative d-inline-block w-100 ${classes}`}>
			<input
				className="rounded border bg-dark text-light border-secondary w-100 text-center"
				type="search"
				value={searchStr}
				onInput={onSearchValueChange}
				disabled={!isLoaded(searchData)}
				ref={targetRef}
				placeholder={I18N_MEGA_SEARCH_PLACEHOLDER}
			/>
			{!isLoaded(searchData) ? <CentredSpinner /> : null}
			{searchStr &&
				searchResults &&
				createPortal(
					<div className="card search-results-dd position-absolute mx-2 my-1" ref={ddRef}>
						<div className="card-body p-2">
							{searchResults && (
								<SearchResultsWrap searchResults={searchResults} searchStr={searchStr} />
							)}
						</div>
					</div>,
					GET_MODALS_EL(),
				)}
		</div>
	)
}
function SearchResultsWrap({
	searchResults,
	searchStr,
}: {
	searchResults: SearchResults
	searchStr: string
}): JSX.Element {
	return (
		<div className="search-results-wrap d-flex align-items-stretch">
			<div className="w-33 h-100 px-1 d-flex flex-column">
				<BlockHeader>{I18N_WEAPONS}</BlockHeader>
				<div className="overflow-auto flex-fill position-relative pe-1">
					{searchResults?.character.length ? (
						searchResults?.character.map(item => (
							<SearchItemCard key={item.code} item={item} searchStr={searchStr} />
						))
					) : (
						<CentredLabel label={I18N_NOTHING_TO_SHOW} />
					)}
				</div>
			</div>
			<div className="w-33 h-100 px-1 d-flex flex-column">
				<BlockHeader>{I18N_CHARACTERS}</BlockHeader>
				<div className="overflow-auto flex-fill position-relative pe-1">
					{searchResults?.weapon.length ? (
						searchResults?.weapon.map(item => (
							<SearchItemCard key={item.code} item={item} searchStr={searchStr} />
						))
					) : (
						<CentredLabel label={I18N_NOTHING_TO_SHOW} />
					)}
				</div>
			</div>
			<div className="w-33 h-100 px-1 d-flex flex-column">
				<BlockHeader>{I18N_ARTIFACTS}</BlockHeader>
				<div className="overflow-auto flex-fill position-relative pe-1">
					{searchResults?.artifact.length ? (
						searchResults?.artifact.map(item => (
							<SearchItemCard key={item.code} item={item} searchStr={searchStr} />
						))
					) : (
						<CentredLabel label={I18N_NOTHING_TO_SHOW} />
					)}
				</div>
			</div>
		</div>
	)
}
function highlightPartOfText(regexp: RegExp, text: string | undefined) {
	if (!text) return undefined
	const parts = text.split(regexp)
	return parts.filter(String).map((part, i) => {
		return regexp.test(part) ? (
			<mark className="p-0" key={i}>
				{part}
			</mark>
		) : (
			<span key={i}>{part}</span>
		)
	})
}
const SearchItemCard = ({ item, searchStr }: { item: SearchItem; searchStr: string }): JSX.Element => {
	const regexp = new RegExp(`(${searchStr})`, 'gi')

	const nameWithHighlight = searchStr ? highlightPartOfText(regexp, item.name) : item.name
	const nameEnWithHighlight = searchStr ? highlightPartOfText(regexp, item.nameEn) : item.nameEn
	return (
		<div className="lh-sm d-flex mt-1 mb-2 py-1">
			<div className="me-1 d-none d-md-block">
				<ItemAvatar src={getIconForItem(item)} />
			</div>
			<div>
				<h6 className="mb-0 text-break">
					<ItemAvatar src={getIconForItem(item)} classes="emoji-avatar me-1 d-md-none" />
					<span className="align-middle">{nameWithHighlight}</span>
				</h6>
				<div className="text-muted small text-break">{nameEnWithHighlight}</div>
				<div className="small">
					{item.type === 'weapon' && (
						<A
							href={`/weapons${genEquipmentHash('weapon', item.code)}`}
							onClick={stopPropagation}
						>
							item detail
						</A>
					)}
					{item.type === 'artifact' && (
						<A
							href={`/artifacts${genEquipmentHash('artifact', item.code)}`}
							onClick={stopPropagation}
						>
							item detail
						</A>
					)}
					{item.type === 'character' && (
						<A href={`/builds/${item.code}`} onClick={stopPropagation}>
							recomended builds
						</A>
					)}
				</div>
			</div>
		</div>
	)
}
