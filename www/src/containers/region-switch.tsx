import { GI_ServerRegionCode } from '#src/../../lib/genshin'
import { SimpleSelect } from '#src/components/select'
import { useLocalStorage } from '#src/utils/hooks'
import { SK_DEFAULT_SELECTED_REGION_CODE, SK_SELECTED_REGION_CODE } from '#src/utils/local-storage-keys'
import { useCallback, useMemo } from 'preact/hooks'

type Opt = { title: string; code: GI_ServerRegionCode }
const europeOpt: Opt = { title: 'europe', code: 'europe' }
const options: Opt[] = [
	europeOpt,
	{ title: 'asia', code: 'asia' },
	{ title: 'north america', code: 'north-america' },
]
export function RegionSwitch({ classes = '' }: { classes?: string }): JSX.Element {
	const [selectedRegionCode, setSelectedRegionCode] = useLocalStorage<GI_ServerRegionCode>(
		SK_SELECTED_REGION_CODE,
		SK_DEFAULT_SELECTED_REGION_CODE,
	)
	const selectedOption = useMemo(
		() => options.find(o => o.code === selectedRegionCode) || europeOpt,
		[selectedRegionCode],
	)
	const onOptSelectLocal = useCallback(o => setSelectedRegionCode(o.code), [setSelectedRegionCode])
	return (
		<SimpleSelect options={options} selectedOption={selectedOption} onOptionSelect={onOptSelectLocal} />
	)
}
