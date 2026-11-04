import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"
import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { breadcrumbsOf, view } from "./view"

/** `/agent-sessions/$sessionId`: one session's four views. One instance per session. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	breadcrumbs: breadcrumbsOf,
})
