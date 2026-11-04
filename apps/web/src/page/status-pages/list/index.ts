import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { init, update } from "./update"
import { view } from "./view"

/** `/status-pages`: every status page of the org. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	breadcrumbs: () => [{ label: "Status pages", isPageHeading: true }],
})
