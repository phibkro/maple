import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { breadcrumbsOf } from "../kit/layout"

import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { view } from "./view"

/**
 * `/security/code` and its tabs (Overview, Findings, Runs) as one instance per org: a tab change keeps
 * the instance, so the targets, runs and findings one tab read serve the next.
 */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	subscriptions,
	breadcrumbs: (model) => breadcrumbsOf("code", model.tab),
})
