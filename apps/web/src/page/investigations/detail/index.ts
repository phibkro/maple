import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { breadcrumbsOf, view } from "./view"

/** `/investigations/$id`: one instance per investigation; the tab and open action are search state. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	breadcrumbs: breadcrumbsOf,
})
