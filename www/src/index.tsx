import { render } from 'preact'

import { App } from 'src/App'

render(<App />, document.querySelector('body .app') as Element)
