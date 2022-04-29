import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks'

import { SearchItem, SearchItemType } from '#lib/parsing/combine'
import { apiGetSearchData } from '#src/api/endpoints'
import { BlockHeader } from '#src/components/block-header'
import { CentredLabel, CentredSpinner } from '#src/components/placeholders'
import {
	I18N_ARTIFACTS,
	I18N_CHARACTERS,
	I18N_MEGA_SEARCH_PLACEHOLDER,
	I18N_NOTHING_TO_SHOW,
	I18N_WEAPONS,
} from '#src/i18n/i18n'
import { genEquipmentHash } from '#src/modules/equipment/common'
import { A, dispatchRouteTo } from '#src/routes/router'
import { getArtifactIconSrc } from '#src/utils/artifacts'
import { calcPosForDd } from '#src/utils/calc-pos-for-dd'
import { getCharacterAvatarSrc } from '#src/utils/characters'
import { GET_MODALS_EL } from '#src/utils/dom'
import {
	isLoaded,
	useClickAway,
	useFetch,
	useForceUpdate,
	useScrollTo,
	useWindowSize,
} from '#src/utils/hooks'
import { createPortal } from '#src/utils/preact-compat'
import { getWeaponIconSrc } from '#src/utils/weapons'
import { ItemAvatar } from './item-cards/item-avatars'

import './mega-search.scss'

type MegaSearch_SearchItem = SearchItem & {
	nameLC: string
	nameEnLC?: string
}
type SearchResults = Record<SearchItemType, MegaSearch_SearchItem[]>

function getIconForItem({ code, type }: { code: string; type: SearchItemType }): string {
	return {
		character: getCharacterAvatarSrc,
		weapon: getWeaponIconSrc,
		artifact: getArtifactIconSrc,
	}[type](code)
}
function searchInItem(item: MegaSearch_SearchItem, searchStr: string): boolean {
	return item.nameLC.includes(searchStr) || (item.nameEnLC ? item.nameEnLC.includes(searchStr) : false)
}
function sortInItem(item: MegaSearch_SearchItem, searchStr: string): number {
	return Math.min(item.nameLC.indexOf(searchStr), item.nameEnLC ? item.nameEnLC.indexOf(searchStr) : 999)
}
const itemTypes: SearchItemType[] = ['character', 'weapon', 'artifact']

export function MegaSearch({ classes = '' }: { classes?: string }): JSX.Element {
	const [searchStr, setSearchStr] = useState<string>('')
	const searchData = useFetch(apiGetSearchData, [])

	const searchDataGrouped = useMemo(() => {
		const searchDataLocal: SearchResults = { weapon: [], character: [], artifact: [] }
		if (isLoaded(searchData)) {
			searchData.forEach(si => {
				searchDataLocal[si.type].push({
					...si,
					nameLC: si.name.toLocaleLowerCase(),
					nameEnLC: si.nameEn?.toLocaleLowerCase(),
				})
			})
		}
		return searchDataLocal
	}, [searchData])

	const clearSearch = useCallback(() => {
		setSearchStr('')
	}, [])

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

	const searchResults = useMemo<SearchResults | null>(() => {
		if (!isLoaded(searchData) || !searchStr) return null
		const searchResultsLocal: SearchResults = { character: [], weapon: [], artifact: [] }
		itemTypes.forEach(t => {
			searchResultsLocal[t] = searchDataGrouped[t]
				.filter(it => searchInItem(it, searchStr))
				.sort((a, b) => sortInItem(b, searchStr) - sortInItem(a, searchStr))
		})
		return searchResultsLocal
	}, [searchStr, searchDataGrouped, searchData])

	useEffect(() => {
		function onKeyPress(e: KeyboardEvent) {
			if (e.key === 'Escape') clearSearch()
		}
		addEventListener('popstate', clearSearch)
		addEventListener('keydown', onKeyPress)
		return () => {
			removeEventListener('popstate', clearSearch)
			removeEventListener('keydown', onKeyPress)
		}
	}, [clearSearch])

	useEffect(() => onResize(), [searchResults, onResize])
	const onSearchValueChange = useCallback((e: JSX.TargetedEvent<HTMLInputElement, Event>) => {
		setSearchStr(e.currentTarget.value.toLocaleLowerCase())
	}, [])
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
								<SearchResultsWrap
									searchResults={searchResults}
									searchStr={searchStr}
									clearSearch={clearSearch}
								/>
							)}
						</div>
					</div>,
					GET_MODALS_EL(),
				)}
		</div>
	)
}

const searckTypeTitleMap: Record<SearchItemType, string> = {
	character: I18N_CHARACTERS,
	artifact: I18N_ARTIFACTS,
	weapon: I18N_WEAPONS,
}
/**
 * Ищет следующую непустую группу в заданном направлении и с заданным отступом
 */
function switchSearchType(
	searchResults: SearchResults,
	selected: { type: SearchItemType; index: number },
	offset: -1 | 0 | 1,
	direction: -1 | 1,
) {
	const fromIndex = itemTypes.indexOf(selected.type)
	const itemsLen = itemTypes.length
	for (let i = 0; i < itemsLen; i++) {
		const index = (i * direction + fromIndex + offset + itemsLen * 2) % itemsLen
		const type = itemTypes[index]
		if (searchResults[type].length > 0) {
			selected.type = type
			selected.index = Math.min(searchResults[type].length - 1, selected.index)
			return true
		}
	}
	return false
}

function SearchResultsWrap({
	searchResults,
	searchStr,
	clearSearch,
}: {
	searchResults: SearchResults
	searchStr: string
	clearSearch: () => unknown
}): JSX.Element {
	const forceUpdate = useForceUpdate()
	const selected = useRef({ type: 'character' as SearchItemType, index: 0 }).current

	useMemo(() => {
		// после изменения поисковой строки выбираем первый элемент
		// и по возможности сохраняем текущую группу
		selected.index = 0
		switchSearchType(searchResults, selected, 0, 1)
	}, [searchResults, selected])

	useEffect(() => {
		function onKeyPress(e: KeyboardEvent) {
			if (e.ctrlKey || e.altKey || e.shiftKey || e.metaKey) return
			const results = searchResults[selected.type]

			if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
				const len = results.length
				if (len > 0) {
					if (e.key === 'ArrowDown') selected.index = (selected.index + 1) % len
					if (e.key === 'ArrowUp') selected.index = (selected.index - 1 + len) % len
				}
				if (e.key === 'ArrowLeft') switchSearchType(searchResults, selected, -1, -1)
				if (e.key === 'ArrowRight') switchSearchType(searchResults, selected, 1, 1)
				forceUpdate()
				e.preventDefault()
			}

			if (['Enter', ' '].includes(e.key)) {
				const item = results[selected.index]
				if (item) {
					const path = mainItemHrefMap[item.type](item.code)
					clearSearch()
					dispatchRouteTo(path)
					e.preventDefault()
				}
			}
		}
		addEventListener('keydown', onKeyPress)
		return () => removeEventListener('keydown', onKeyPress)
	}, [forceUpdate, clearSearch, searchResults, selected])

	return (
		<div className="search-results-wrap d-flex align-items-stretch">
			{itemTypes.map(type => (
				<div className="w-33 h-100 px-1 d-flex flex-column" key={type}>
					<BlockHeader>{searckTypeTitleMap[type]}</BlockHeader>
					<div className="overflow-auto flex-fill position-relative pe-1">
						{searchResults[type].length ? (
							searchResults[type].map((item, i) => (
								<SearchItemCard
									key={item.code}
									item={item}
									searchStr={searchStr}
									isSelected={type === selected.type && i === selected.index}
									clearSearch={clearSearch}
								/>
							))
						) : (
							<CentredLabel label={I18N_NOTHING_TO_SHOW} />
						)}
					</div>
				</div>
			))}
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
const mainItemHrefMap: Record<SearchItemType, (code: string) => string> = {
	weapon: c => `/weapons${genEquipmentHash('weapon', c)}`,
	artifact: c => `/artifacts${genEquipmentHash('artifact', c)}`,
	character: c => `/builds/${c}`,
}
const SearchItemCard = ({
	item,
	searchStr,
	isSelected,
	clearSearch,
}: {
	item: SearchItem
	searchStr: string
	isSelected: boolean
	clearSearch: () => unknown
}): JSX.Element => {
	const [wrapRef] = useScrollTo<HTMLDivElement>(isSelected, { block: 'nearest' })

	const regexp = new RegExp(`(${searchStr})`, 'gi')
	const nameWithHighlight = searchStr ? highlightPartOfText(regexp, item.name) : item.name
	const nameEnWithHighlight = searchStr ? highlightPartOfText(regexp, item.nameEn) : item.nameEn
	const mainItemHref = mainItemHrefMap[item.type](item.code)
	return (
		<div
			className="lh-sm d-flex mt-1 mb-2 py-1"
			ref={wrapRef}
			style={{ background: isSelected ? 'red' : null }}
		>
			<div className="me-1 d-none d-md-block ">
				<ItemAvatar
					src={getIconForItem(item)}
					href={mainItemHref}
					classes="bg-dark-on-dark"
					onClick={clearSearch}
				/>
			</div>
			<div>
				<h6 className="mb-0 text-break">
					<ItemAvatar src={getIconForItem(item)} classes="emoji-avatar me-1 d-md-none" />
					<span className="align-middle">{nameWithHighlight}</span>
				</h6>
				<div className="text-muted small text-break">{nameEnWithHighlight}</div>
				<div className="small">
					{item.type === 'weapon' && (
						<A href={mainItemHref} onClick={clearSearch}>
							item detail
						</A>
					)}
					{item.type === 'artifact' && (
						<A href={mainItemHref} onClick={clearSearch}>
							item detail
						</A>
					)}
					{item.type === 'character' && (
						<A href={mainItemHref} onClick={clearSearch}>
							recomended builds
						</A>
					)}
				</div>
			</div>
		</div>
	)
}
