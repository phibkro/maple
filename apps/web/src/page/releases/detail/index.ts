import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { breadcrumbsOf, view } from "./view"

/** `/releases/$commitSha`: one instance per commit; a search change arrives as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: breadcrumbsOf,
})
