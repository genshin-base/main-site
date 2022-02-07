import { Builds } from '#src/modules/builds/builds'

export function BuildsPage({ code }: { code?: string }) {
	return <Builds code={code} />
}
