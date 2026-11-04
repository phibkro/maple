import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { breadcrumbsOf } from "../kit/layout"

import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { view } from "./view"

/**
 * `/security/dependencies`, in the Security frame: lockfile scans of the connected repositories,
 * so no code-audit plan gates it.
 */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	subscriptions,
	breadcrumbs: () => breadcrumbsOf("dependencies"),
})
