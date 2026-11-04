import { implementPage } from "../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { contextChanged, init, revive, routeChanged, update } from "./update"
import { view } from "./view"

/** `/`: the Overview home page. One instance per org; search changes arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	revive,
	contextChanged,
	view,
	subscriptions,
	breadcrumbs: () => [{ label: "Overview", isPageHeading: true }],
})
