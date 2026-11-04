import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { init, update } from "./update"
import { view } from "./view"

/** `/sources`: every source the org sends from. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	breadcrumbs: () => [{ label: "Sources", isPageHeading: true }],
})
