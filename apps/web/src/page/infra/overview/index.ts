import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, infraSurfacesSettled, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/infra`: every source's health, what needs a look first. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	infraSurfacesSettled,
	view,
	breadcrumbs: () => [{ label: "Infrastructure", isPageHeading: true }],
})
