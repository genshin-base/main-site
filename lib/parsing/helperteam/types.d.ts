import type { GI_ElementCode, GI_WeaponTypeCode } from '#lib/genshin'
import type { CompactTextParagraphs } from './text'

// === Common ===

type LangMode = 'monolang' | 'multilang'

type LangsIf<TLangMode extends LangMode, TVal> = TLangMode extends 'multilang' ? Record<string, TVal> : TVal

type BottomNotes<T extends LangMode> = {
	notes: LangsIf<T, CompactTextParagraphs | null>
	seeCharNotes: boolean
}

// === Artifacts ===

type ArtifactInfo<T extends LangMode> = {
	code: string
	sets:
		| { '1': LangsIf<T, CompactTextParagraphs> }
		| { '2': LangsIf<T, CompactTextParagraphs>; '4': LangsIf<T, CompactTextParagraphs> }
}

type ArtifactRef = { code: string; count: number }

type ArtifactRefNode = { op: 'and' | 'or'; arts: (ArtifactRef | ArtifactRefNode)[] }

type ArtifactSetAdvice<T extends LangMode> = { arts: ArtifactRef | ArtifactRefNode } & BottomNotes<T>

type ArtifactSetAdvices<T extends LangMode> = { sets: ArtifactSetAdvice<T>[] } & BottomNotes<T>

type ArtifactAdviceGroup<T extends LangMode> = { title: string | null; advices: ArtifactSetAdvices<T> }

type ArtifactStatAdvice<T extends LangMode> = { codes: string[] } & BottomNotes<T>
type ArtifactMainStatAdvices<T extends LangMode> = {
	sands: ArtifactStatAdvice<T>
	goblet: ArtifactStatAdvice<T>
	circlet: ArtifactStatAdvice<T>
} & BottomNotes<T>

type ArtifactSubStatAdvices<T extends LangMode> = { advices: ArtifactStatAdvice<T>[] } & BottomNotes<T>

// === Weapons ===

type WeaponInfoStat = { code: string; value1: number; value90: number }

type WeaponInfo<T extends LangMode> = {
	code: string
	typeCode: GI_WeaponTypeCode
	mainStat: WeaponInfoStat
	subStat: WeaponInfoStat
	passiveStat: LangsIf<T, CompactTextParagraphs>
}

type WeaponRef<T extends LangMode> = {
	code: string
	refine: string | null
	stacks: number | null
} & BottomNotes<T>

type SimilarWeaponAdvice<T extends LangMode> = { similar: WeaponRef<T>[] }

type WeaponAdvices<T extends LangMode> = { advices: SimilarWeaponAdvice<T>[] } & BottomNotes<T>

// === Characters ===

type TalentCode = 'attack' | 'skill' | 'burst'
type TalentAdvices<T extends LangMode> = { advices: (TalentCode | TalentCode[])[] } & BottomNotes<T>

type CharacterBuildInfoRole<T extends LangMode> = {
	code: string
	isRecommended: boolean
	weapons: WeaponAdvices<T>
	artifacts: ArtifactSetAdvices<T>
	mainStats: ArtifactMainStatAdvices<T>
	subStats: ArtifactSubStatAdvices<T>
	talents: TalentAdvices<T>
	tips: LangsIf<T, CompactTextParagraphs | null>
	notes: LangsIf<T, CompactTextParagraphs | null>
}

type CharacterBuildInfo<T extends LangMode> = {
	code: string
	elementCode: GI_ElementCode
	roles: CharacterBuildInfoRole<T>[]
	credits: LangsIf<T, CompactTextParagraphs | null>
}

// === Changelogs ===

type ChangelogsTable = {
	rows: { date: string; changes: CompactTextParagraphs; appliedBy: string }[]
}

// === Builds ===

type BuildInfo<T extends LangMode> = {
	characters: CharacterBuildInfo<T>[]
	artifacts: ArtifactInfo<T>[]
	weapons: WeaponInfo<T>[]
}
