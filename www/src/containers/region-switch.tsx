import { useCallback, useMemo } from 'preact/hooks'

import { GI_ServerRegionCode } from '#src/../../lib/genshin'
import { SimpleSelect } from '#src/components/select'
import { I18N_ASIA, I18N_EUROPE, I18N_NORH_AMERICA } from '#src/i18n/i18n'
import { useVersionedStorage } from '#src/utils/hooks'
import { SV_SELECTED_REGION_CODE } from '#src/utils/local-storage-keys'

type Opt = { title: string; code: GI_ServerRegionCode }
const europeOpt: Opt = { title: I18N_EUROPE, code: 'europe' }
const options: Opt[] = [
	europeOpt,
	{ title: I18N_ASIA, code: 'asia' },
	{ title: I18N_NORH_AMERICA, code: 'north-america' },
]

export function RegionSwitch({ classes = '' }: { classes?: string }): JSX.Element {
	const [selectedRegionCode, setSelectedRegionCode] = useVersionedStorage(SV_SELECTED_REGION_CODE)
	const selectedOption = useMemo(
		() => options.find(o => o.code === selectedRegionCode) || europeOpt,
		[selectedRegionCode],
	)
	const onOptSelectLocal = useCallback(o => setSelectedRegionCode(o.code), [setSelectedRegionCode])
	return (
		<SimpleSelect options={options} selectedOption={selectedOption} onOptionSelect={onOptSelectLocal} />
	)
}
