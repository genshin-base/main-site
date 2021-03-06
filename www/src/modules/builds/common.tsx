import { useCallback, useMemo } from 'preact/hooks'

import { CharacterFullInfoWithRelated } from '#lib/parsing/combine'
import { CompactTextParagraphs, TextNode } from '#lib/parsing/helperteam/text'
import { ArtifactRef, ArtifactRefNode, CharacterBuildInfoRole } from '#lib/parsing/helperteam/types'
import { mustBeDefined, staticNever } from '#lib/utils/values'
import { ART_GROUP_CODES } from '#src/api/generated'
import { MapAllByCode } from '#src/api/utils'
import { Tooltip } from '#src/components/tooltip'
import { ArtifactCard } from '#src/containers/item-cards/dd-cards'
import { ItemLabelWithDd, LabeledItemAvatar } from '#src/containers/item-cards/item-avatars'
import { logError } from '#src/errors'
import { I18N_ART_GROUP_NAME, I18N_CONJUCTIONS, I18N_FAV_TIPS, I18N_STAT_NAME } from '#src/i18n/i18n'
import { getAllArtifacts, getArtifactIconSrc } from '#src/utils/artifacts'
import { Migration, useHover, useVersionedStorage } from '#src/utils/hooks'
import {
	SV_FAV_CHAR_CODES,
	SV_FAV_TALENT_MATERIAL_CODES,
	SV_FAV_WEAPON_DATAS,
	SV_FAV_WEAPON_PRIMARY_MATERIAL_CODES,
	SV_FavCodes,
} from '#src/utils/local-storage-keys'
import { HEART, HEART_EMPTY, STAR } from '#src/utils/typography'

export const DUMMY_ROLE: { code: string; name: string } & Partial<CharacterBuildInfoRole<'monolang'>> = {
	name: '…',
	code: '',
}
export const DUMMY_ROLES = [DUMMY_ROLE]

export type BuildRoleOrDummy = CharacterBuildInfoRole<'monolang'> | typeof DUMMY_ROLE

export function makeRoleTitle(r: BuildRoleOrDummy) {
	return (
		<span key={r.code}>
			{r.isRecommended && (
				<span className="fs-4 lh-1 opacity-75 text-rarity-5 align-bottom">{STAR}</span>
			)}
			{r.name}
		</span>
	)
}
export const CIRCLET_GOBLET_SANDS = ['sands', 'goblet', 'circlet'] as const
export function getRoleData(build: CharacterFullInfoWithRelated, selectedCode: string) {
	return mustBeDefined(build.character.roles.find(x => x.code === selectedCode))
}
export function genArtMainStatDetail(
	role: CharacterBuildInfoRole<'monolang'>,
	itemCode: 'circlet' | 'goblet' | 'sands',
	isShort?: boolean,
) {
	return (
		<span className="">
			{genSimpleList(role.mainStats[itemCode].codes.map(I18N_STAT_NAME))}{' '}
			{!isShort && genNotes(role.mainStats[itemCode])}
			{!isShort && genSeeCharNotes(role.mainStats[itemCode])}
		</span>
	)
}
export function genSimpleList(arr: string[]) {
	return arr.join(', ')
}
export function notesWrap(str) {
	return <span className="text-muted small">{str}</span>
}
export function genNotes(item: { notes: CompactTextParagraphs | null }) {
	return item.notes === null ? '' : notesWrap(notesToJSX(item.notes))
}
export function genSeeCharNotes(item: { seeCharNotes: boolean }) {
	return '' //TODO
	return item.seeCharNotes ? notesWrap(' (see notes)') : ''
}
export function notesToJSX(tips: CompactTextParagraphs | null): JSX.Nodes {
	function processString(str: string) {
		return str
			.split('\n')
			.map((sub, i, arr) => [sub, i < arr.length - 1 ? <br /> : ''])
			.flat()
			.filter(a => a)
	}
	function processObj(tip: TextNode) {
		if (typeof tip === 'string') return processString(tip)
		if ('p' in tip) return <p>{notesToJSX(tip.p)}</p>
		if ('b' in tip) return <b class="text-normal">{notesToJSX(tip.b)}</b>
		if ('i' in tip) return <i>{notesToJSX(tip.i)}</i>
		if ('s' in tip) return <s>{notesToJSX(tip.s)}</s>
		if ('a' in tip)
			return (
				<a href={tip.href} target="_blank">
					{notesToJSX(tip.a)}
				</a>
			)
		if ('weapon' in tip)
			return (
				<ItemLabelWithDd type="weapon" code={tip.code}>
					{notesToJSX(tip.weapon)}
				</ItemLabelWithDd>
			)
		if ('artifact' in tip)
			return (
				<ItemLabelWithDd type="artifact" code={tip.code}>
					{notesToJSX(tip.artifact)}
				</ItemLabelWithDd>
			)
		if ('item' in tip) return <>{notesToJSX(tip.item)}</>
		staticNever(tip)
		logError('unknown text node: ' + JSON.stringify(tip))
		return <span>{JSON.stringify(tip)}</span>
	}
	if (!tips) return null
	if (Array.isArray(tips)) return tips.map(processObj).flat()
	return processObj(tips)
}

export function getCoverArtifactForSet(code, artsForDd) {
	let coverArt
	if (code in ART_GROUP_CODES) {
		coverArt = {
			name: I18N_ART_GROUP_NAME[code],
			code: code,
			rarity: 5,
		}
	} else {
		coverArt = artsForDd[0]
	}
	return coverArt
}
export function genArtifactAdvice(
	set: ArtifactRef | ArtifactRefNode,
	build: MapAllByCode<CharacterFullInfoWithRelated>,
	isLast = true,
) {
	// todo notes
	if ('code' in set) {
		//ArtifactRef
		const artifactsForDd = getAllArtifacts(set.code, build.maps.artifacts)
		if (!artifactsForDd.length) return null
		const coverArt = getCoverArtifactForSet(set.code, artifactsForDd)
		return (
			<LabeledItemAvatar
				imgSrc={getArtifactIconSrc(set.code)}
				rarity={coverArt.rarity}
				title={coverArt.name}
				key={set.code}
				avatarTopEndBadge={'x' + set.count}
				avatarClasses="with-padding"
				classes={`small ${isLast ? 'mb-1' : ''}`}
				ddComponent={
					<ArtifactCard artifacts={artifactsForDd} related={build.maps} title={coverArt.name} />
				}
			/>
		)
	} else {
		//ArtifactRefNode
		return (
			<ItemsListGroupWrap>
				{set.arts.map((art, i) => {
					const isLastInList = i >= set.arts.length - 1
					return (
						<>
							{genArtifactAdvice(art, build, isLastInList)}
							{!isLastInList && <ItemsJoinerWrap>{I18N_CONJUCTIONS[set.op]}</ItemsJoinerWrap>}
						</>
					)
				})}
			</ItemsListGroupWrap>
		)
	}
}
export function ItemsJoinerWrap({ children }): JSX.Element {
	return <div className="text-start text-muted small px-5 my-n1">{children}</div>
}
export function ItemsListGroupWrap({
	children,
}: {
	children: JSX.Node | (JSX.Element | null)[]
}): JSX.Element {
	return <div className="border-2 rounded border-secondary border-start ps-2">{children}</div>
}
export const MAX_SMTHS_TO_STORE = 5
export function removeOldSmthsFromList<T>(codes: T[]): T[] {
	return codes.slice(0, MAX_SMTHS_TO_STORE)
}

function ToggleSmthFav<
	TStorageKey extends {
		key: string
		versions: readonly [...Migration<unknown, unknown>[], Migration<unknown, SV_FavCodes>]
	},
>({
	smthCode,
	classes,
	storageKey,
	tipFav,
	tipNotFav,
}: {
	smthCode: string
	classes?: string
	storageKey: TStorageKey
	tipFav: string
	tipNotFav: string
}): JSX.Element {
	const [favSmthCodes, setFavSmthCodes] = useVersionedStorage(storageKey)
	const [elRef, isHovered] = useHover<HTMLDivElement>()
	const isFav = ~favSmthCodes.indexOf(smthCode)
	const toggleFav = useCallback(() => {
		setFavSmthCodes(
			removeOldSmthsFromList(
				isFav ? favSmthCodes.filter(c => c !== smthCode) : [smthCode, ...favSmthCodes],
			),
		)
	}, [smthCode, setFavSmthCodes, favSmthCodes, isFav])
	return (
		<div
			role="button"
			className={`user-select-none lh-1 ${isFav ? 'text-danger' : 'text-danger opacity-50'} ${classes}`}
			onClick={toggleFav}
			ref={elRef}
		>
			{isFav ? HEART : HEART_EMPTY}
			{elRef.current && isHovered ? (
				<Tooltip targetEl={elRef.current}>{isFav ? tipFav : tipNotFav}</Tooltip>
			) : null}
		</div>
	)
}

export function ToggleCharFav({
	characterCode,
	classes,
}: {
	characterCode: string
	classes?: string
}): JSX.Element {
	return (
		<ToggleSmthFav
			smthCode={characterCode}
			classes={classes}
			storageKey={SV_FAV_CHAR_CODES}
			tipFav={I18N_FAV_TIPS.remove.character}
			tipNotFav={I18N_FAV_TIPS.add.character}
		/>
	)
}
export function ToggleWeaponPrimaryMaterialFav({
	itemCode,
	classes,
}: {
	itemCode: string
	classes?: string
}): JSX.Element {
	return (
		<ToggleSmthFav
			smthCode={itemCode}
			classes={classes}
			storageKey={SV_FAV_WEAPON_PRIMARY_MATERIAL_CODES}
			tipFav={I18N_FAV_TIPS.remove.material}
			tipNotFav={I18N_FAV_TIPS.add.material}
		/>
	)
}
export function ToggleTalentMaterialFav({
	itemCode,
	classes,
}: {
	itemCode: string
	classes?: string
}): JSX.Element {
	return (
		<ToggleSmthFav
			smthCode={itemCode}
			classes={classes}
			storageKey={SV_FAV_TALENT_MATERIAL_CODES}
			tipFav={I18N_FAV_TIPS.remove.material}
			tipNotFav={I18N_FAV_TIPS.add.material}
		/>
	)
}

//not used
export function ToggleWeaponFav({
	weaponCode,
	weapMatCode,
	classes,
}: {
	weaponCode: string
	weapMatCode: string
	classes?: string
}): JSX.Element {
	const [favWeaponDatas, setWeaponDatas] = useVersionedStorage(SV_FAV_WEAPON_DATAS)
	const favWeaponCodes = useMemo(() => favWeaponDatas.map(wd => wd[0]), [favWeaponDatas])
	const [elRef, isHovered] = useHover<HTMLDivElement>()
	const isFav = ~favWeaponCodes.indexOf(weaponCode)
	const toggleFav = useCallback(() => {
		setWeaponDatas(
			removeOldSmthsFromList(
				isFav
					? favWeaponDatas.filter(d => d[0] !== weaponCode)
					: [[weaponCode, weapMatCode], ...favWeaponDatas],
			),
		)
	}, [weaponCode, weapMatCode, setWeaponDatas, favWeaponDatas, isFav])
	return (
		<div
			role="button"
			className={`user-select-none lh-1 ${isFav ? 'text-danger' : 'text-danger opacity-50'} ${classes}`}
			onClick={toggleFav}
			ref={elRef}
		>
			{isFav ? HEART : HEART_EMPTY}
			{elRef.current && isHovered ? (
				<Tooltip targetEl={elRef.current}>
					{isFav ? I18N_FAV_TIPS.remove.weapon : I18N_FAV_TIPS.add.weapon}
				</Tooltip>
			) : null}
		</div>
	)
}
