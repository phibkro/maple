import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { breadcrumbsOf } from "../kit/layout"

import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { view } from "./view"

/**
 * `/security/exposure` and `/security/runtimes` as one instance per org, in the Security frame:
 * telemetry the org already sends, so no code-audit plan gates them.
 */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	subscriptions,
	breadcrumbs: (model) => breadcrumbsOf(model.tab),
})
