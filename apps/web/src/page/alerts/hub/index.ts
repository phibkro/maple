import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/alerts`: the incident-first hub (Inbox, Rules, Routing). One instance per org; tabs are search. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	subscriptions,
	breadcrumbs: () => [{ label: "Alerts", isPageHeading: true }],
})
