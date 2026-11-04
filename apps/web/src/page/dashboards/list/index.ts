import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"
import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/dashboards`: the org's dashboards. One instance per org; search changes arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	subscriptions,
	breadcrumbs: () => [{ label: "Dashboards", isPageHeading: true }],
})
