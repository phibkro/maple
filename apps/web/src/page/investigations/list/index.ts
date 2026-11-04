import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/investigations`: one instance; a search change arrives as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	breadcrumbs: () => [{ label: "Investigations", isPageHeading: true }],
})
