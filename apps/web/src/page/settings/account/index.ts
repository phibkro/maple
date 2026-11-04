import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { init, routeChanged, update } from "./update"
import { breadcrumbs, view } from "./view"

/** `/account`: one instance; a tab switch is a search change (`routeChanged`). */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	breadcrumbs,
})
