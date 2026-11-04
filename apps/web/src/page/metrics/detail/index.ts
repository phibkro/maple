import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { backToMetricsHref, contextChanged, init, routeChanged, update } from "./update"
import { subscriptions } from "./subscription"
import { view } from "./view"

/** `/metrics/$metricName`: one instance per metric; query changes arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	breadcrumbs: (model) => [
		{ label: "Metrics", href: backToMetricsHref(model.search) },
		{ label: model.metricName },
	],
})
