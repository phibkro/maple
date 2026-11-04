import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { breadcrumbsOf, view } from "./view"

/** `/status-pages/$pageId`: one instance per page; Settings, JSON and the live screen are search. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	subscriptions,
	breadcrumbs: breadcrumbsOf,
})
