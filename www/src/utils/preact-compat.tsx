// direct imports to avoid kilobytes of side-effects from 'preact/compat'
// normal imports (preact/compat/src/memo) do not work with webpack (it strictly follows 'exports' field in package.json)
import { memo as memo_ } from '#src/../../node_modules/preact/compat/src/memo'
import { createPortal as createPortal_ } from '#src/../../node_modules/preact/compat/src/portals'

import type { createPortal as createPortalOrig } from 'preact/compat'
import type { memo as memoOrig } from 'preact/compat'

export const createPortal = createPortal_ as typeof createPortalOrig
export const memo = memo_ as typeof memoOrig
