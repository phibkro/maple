import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/logs`: the logs stream. One instance per org; search changes arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	breadcrumbs: () => [{ label: "Logs", isPageHeading: true }],
})
