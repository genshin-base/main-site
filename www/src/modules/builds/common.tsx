import {
	ART_GROUP_18_ATK_CODE,
	ART_GROUP_18_ATK_DETAIL,
	ART_GROUP_18_ATK_INSIDE_CODES,
	ART_GROUP_20_ER_CODE,
	ART_GROUP_20_ER_DETAIL,
	ART_GROUP_20_ER_INSIDE_CODES,
} from '#lib/genshin'
import { CharacterFullInfoWithRelated } from '#lib/parsing/combine'
import { ArtifactRef, ArtifactRefNode } from '#lib/parsing/helperteam/artifacts'
import { CharacterBuildInfoRole } from '#lib/parsing/helperteam/characters'
import { CompactTextParagraphs, TextNode } from '#lib/parsing/helperteam/text'
import { mustBeDefined } from '#lib/utils/values'
import { MapAllByCode } from '#src/api/utils'
import { Tooltip } from '#src/components/tooltip'
import { ArtifactDetailDd } from '#src/containers/item-cards/dd-cards'
import { LabeledItemAvatar } from '#src/containers/item-cards/item-cards'
import { getArtifactIconSrc } from '#src/utils/artifacts'
import { useHover, useLocalStorage } from '#src/utils/hooks'
import { HEART, HEART_EMPTY, STAR } from '#src/utils/typography'
import { useCallback, useRef } from 'preact/hooks'

export const DUMMY_ROLE: { code: string; title: string } & Partial<CharacterBuildInfoRole> = {
	title: '…',
	code: '',
}
export const DUMMY_ROLES = [DUMMY_ROLE]

export type BuildRoleOrDummy = CharacterBuildInfoRole | typeof DUMMY_ROLE

export function makeRoleTitle(r: BuildRoleOrDummy) {
	return (
		<span key={r.code}>
			{r.isRecommended && (
				<span className="fs-4 lh-1 opacity-75 text-warning align-bottom">{STAR}</span>
			)}
			{r.code}
		</span>
	)
}
export const CIRCLET_GOBLET_SANDS = ['sands', 'goblet', 'circlet'] as const
export function getRoleData(build: CharacterFullInfoWithRelated, selectedCode: string) {
	return mustBeDefined(build.character.roles.find(x => x.code === selectedCode))
}
export function genArtMainStatDetail(
	role: CharacterBuildInfoRole,
	itemCode: 'circlet' | 'goblet' | 'sands',
	isShort?: boolean,
) {
	return (
		<span className="">
			{genSimpleList(role.mainStats[itemCode].codes)}
			{isShort
				? ' ' + genNotes(role.mainStats[itemCode]) + genSeeCharNotes(role.mainStats[itemCode])
				: null}
		</span>
	)
}
export function genSimpleList(arr: string[]) {
	return arr.join(', ')
}
export function notesWrap(str) {
	return <div className="text-muted small">{str}</div>
}
export function genNotes(item: { notes: CompactTextParagraphs | null }) {
	return item.notes === null ? '' : notesWrap(JSON.stringify(item.notes))
}
export function genSeeCharNotes(item: { seeCharNotes: boolean }) {
	return '' //TODO
	return item.seeCharNotes ? notesWrap(' (see notes)') : ''
}
export function notesToJSX(tips: CompactTextParagraphs | null) {
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
		if ('b' in tip) return <b className="opacity-75 text-normal">{notesToJSX(tip.b)}</b>
		if ('i' in tip) return <i>{notesToJSX(tip.i)}</i>
		if ('u' in tip) return <u>{notesToJSX(tip.u)}</u>
		if ('s' in tip) return <s>{notesToJSX(tip.s)}</s>
		if ('a' in tip) return <a href={tip.href}>{notesToJSX(tip.a)}</a>
		console.warn('unknown element type in notes: ', tip)
		return <span>{JSON.stringify(tip)}</span>
	}
	if (!tips) return null
	if (Array.isArray(tips)) return tips.map(processObj)
	return processObj(tips)
}

export function genArtofactAdvice(
	set: ArtifactRef | ArtifactRefNode,
	build: MapAllByCode<CharacterFullInfoWithRelated>,
	isLast = true,
) {
	// todo notes
	if ('code' in set) {
		//ArtifactRef
		let artifactsForDd, artifactForList
		switch (set.code) {
			case ART_GROUP_18_ATK_CODE:
				artifactsForDd = ART_GROUP_18_ATK_INSIDE_CODES.map(code => build.maps.artifacts.get(code))
				artifactForList = ART_GROUP_18_ATK_DETAIL
				break
			case ART_GROUP_20_ER_CODE:
				artifactsForDd = ART_GROUP_20_ER_INSIDE_CODES.map(code => build.maps.artifacts.get(code))
				artifactForList = ART_GROUP_20_ER_DETAIL
				break
			default:
				artifactForList = build.maps.artifacts.get(set.code)
				artifactsForDd = [artifactForList]
		}
		if (!artifactsForDd.length) return null
		return (
			<LabeledItemAvatar
				imgSrc={getArtifactIconSrc(set.code)}
				rarity={artifactForList.rarity}
				title={artifactForList.name}
				key={set.code}
				avatarBadge={'x' + set.count}
				avatarClasses="with-padding"
				classes={`small ${isLast ? 'mb-1' : ''}`}
				ddProps={{
					DdComponent: ArtifactDetailDd,
					ddItems: artifactsForDd,
					related: build.maps,
				}}
			/>
		)
	} else {
		//ArtifactRefNode
		return set.arts.map((art, i) => {
			const isLastInList = i >= set.arts.length - 1
			return (
				<>
					{genArtofactAdvice(art, build, isLastInList)}
					{!isLastInList && <ItemsJoinerWrap>{set.op}</ItemsJoinerWrap>}
				</>
			)
		})
	}
}
export function ItemsJoinerWrap({ children }: { children: JSX.Node }): JSX.Element {
	return <div className="text-start text-lg-center text-muted small px-5">{children}</div>
}
export const MAX_CHARACTERS_TO_STORE = 5
export function removeOldCharsFromList(codes: string[]): string[] {
	return codes.slice(0, MAX_CHARACTERS_TO_STORE)
}

export function ToggleCharFav({
	characterCode,
	classes,
}: {
	characterCode: string
	classes?: string
}): JSX.Element {
	const [favCharCodes, setFavCharCodes] = useLocalStorage<string[]>('favoriteCharacterCodes', [])
	const [elRef, isHovered] = useHover<HTMLDivElement>()
	const isFav = ~favCharCodes.indexOf(characterCode)
	const toggleFav = useCallback(() => {
		setFavCharCodes(
			removeOldCharsFromList(
				isFav ? favCharCodes.filter(c => c !== characterCode) : [characterCode, ...favCharCodes],
			),
		)
	}, [characterCode, setFavCharCodes, favCharCodes, isFav])
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
					{isFav ? 'Remove character from your favorites' : 'Add character to your favorites'}
				</Tooltip>
			) : null}
		</div>
	)
}

export function ToggleTalentMaterialFav({
	itemCode,
	classes,
}: {
	itemCode: string
	classes?: string
}): JSX.Element {
	const [favTalMatCodes, setTalMatCodes] = useLocalStorage<string[]>('favoriteTalentMaterialCodes', [])
	const [elRef, isHovered] = useHover<HTMLDivElement>()
	const isFav = ~favTalMatCodes.indexOf(itemCode)
	const toggleFav = useCallback(() => {
		setTalMatCodes(
			removeOldCharsFromList(
				isFav ? favTalMatCodes.filter(c => c !== itemCode) : [itemCode, ...favTalMatCodes],
			),
		)
	}, [itemCode, setTalMatCodes, favTalMatCodes, isFav])
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
					{isFav ? 'Remove material from your favorites' : 'Add material to your favorites'}
				</Tooltip>
			) : null}
		</div>
	)
}
