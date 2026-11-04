import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/metrics`: the metric explorer. One instance per org; search changes arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: () => [{ label: "Metrics", isPageHeading: true }],
})
