import { implementPage } from "../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/service-map`. One instance per org; search changes (window, environment, focus) arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	breadcrumbs: () => [{ label: "Service map", isPageHeading: true }],
})
