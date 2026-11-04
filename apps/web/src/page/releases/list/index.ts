import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/releases`: one instance; a search change arrives as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: () => [{ label: "Releases", isPageHeading: true }],
})
