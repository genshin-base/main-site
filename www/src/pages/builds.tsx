import { useEffect } from 'preact/hooks'

import { GI_RarityCode } from '#lib/genshin'
import { ArtifactRegularInfo, CharacterFullInfoWithRelated } from '#lib/parsing/combine'
import { CompactTextParagraphs, getInlineText, isParagraphArr } from '#lib/parsing/helperteam/text'
import { CharacterBuildInfoRole } from '#lib/parsing/helperteam/types'
import { useBuildWithDelayedLocs } from '#src/api'
import { MapAllByCode } from '#src/api/utils'
import { Spinner } from '#src/components/placeholders'
import { CharacterPicker } from '#src/containers/character-picker/character-picker'
import { FavoriteCharacters } from '#src/containers/character-picker/favorite-characters'
import {
	I18N_BUILD_RECS_FOR,
	I18N_BUILDS_PAGE_DESCRIPTION,
	I18N_CHAR_BUILD_RECS,
	I18N_CHARACTER_PAGE_DESCRIPTION,
	I18N_LOADING,
	I18N_PAGE_TITLE_POSTFIX,
	I18N_RECOMMENDED_RU_ONLY,
	I18N_SELECT_CHAR_BELOW,
} from '#src/i18n/i18n'
import { CharacterBuildDetailed } from '#src/modules/builds/character-build-detailed'
import { isLoaded, useDocumentTitle, usePageDescription } from '#src/utils/hooks'

export function BuildsPage_CharSelect(): JSX.Element {
	useDocumentTitle(I18N_CHAR_BUILD_RECS + I18N_PAGE_TITLE_POSTFIX)

	usePageDescription(() => I18N_BUILDS_PAGE_DESCRIPTION)

	return (
		<div className="builds container">
			<h1 className="my-1 letter-spacing-1">{I18N_CHAR_BUILD_RECS}</h1>
			<h5 className="mt-2 mb-3 opacity-75">{I18N_SELECT_CHAR_BELOW}</h5>
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

	useDocumentTitle(
		isLoaded(build)
			? build.character.name + ' ' + I18N_BUILD_RECS_FOR + I18N_PAGE_TITLE_POSTFIX
			: I18N_LOADING + I18N_PAGE_TITLE_POSTFIX,
	)

	usePageDescription(() => {
		if (!isLoaded(build)) return null
		const role = build.character.roles.find(x => x.isRecommended) ?? build.character.roles[0]
		if (!role) return null
		const weaponR5 = findWeaponWithRarity(build, role, 5)
		const weaponR4 = findWeaponWithRarity(build, role, 4)
		const art = findFirtArtifact(build, role)
		return I18N_CHARACTER_PAGE_DESCRIPTION(
			build.character.name,
			paragraphsToInline(role.name),
			weaponR5?.name,
			weaponR4?.name,
			art?.name,
			paragraphsToInline(role.tips),
			paragraphsToInline(role.notes),
		)
	})

	if (!isLoaded(build)) return <Spinner />

	return (
		<div className="builds container">
			<h1 className={`my-1 letter-spacing-1 ${BUNDLE_ENV.LANG === 'en' ? 'text-capitalize' : ''}`}>
				<span className="d-none d-xl-inline">{build.character.name}</span>
				<span className="d-xl-none">{I18N_RECOMMENDED_RU_ONLY}</span> {I18N_BUILD_RECS_FOR}
			</h1>
			<FavoriteCharacters navigateToCharacter={true} selectedCharacterCode={code} />
			<CharacterBuildDetailed build={build} isUpdating={isUpdating} />
		</div>
	)
}

function findWeaponWithRarity(
	build: MapAllByCode<CharacterFullInfoWithRelated>,
	role: CharacterBuildInfoRole<'monolang'>,
	rarity: GI_RarityCode,
) {
	for (const item of role.weapons.advices)
		for (const weapon of item.similar) {
			const data = build.maps.weapons.get(weapon.code)
			if (data && data.rarity === rarity) return data
		}
	return null
}

function findFirtArtifact(
	build: MapAllByCode<CharacterFullInfoWithRelated>,
	role: CharacterBuildInfoRole<'monolang'>,
) {
	return (function iter(arts): ArtifactRegularInfo | null {
		for (const item of arts) {
			if ('op' in item) return iter(item.arts)
			const data = build.maps.artifacts.get(item.code)
			if (data) return data
		}
		return null
	})(role.artifacts.sets.map(x => x.arts))
}

function paragraphsToInline(node: CompactTextParagraphs | null): string {
	if (node === null) return ''
	if (typeof node !== 'string') {
		if (isParagraphArr(node)) return node.map(x => paragraphsToInline(x)).join(' ')
		if ('p' in node) return paragraphsToInline(node.p)
	}
	let text = getInlineText(node)
	text = text.trim().replaceAll('\n', ': ') //двоеточие после подзаголовков
	return text
}
