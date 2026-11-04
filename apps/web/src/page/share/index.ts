import { implementPage } from "../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { view } from "./view"

/**
 * `/share/$token`: a public page outside the shell. The root renders it bare and gives it a
 * context without a signed-in org (see `pageContextOf`); one instance per token.
 */
export const page = implementPage(contract, {
	init: (route) => init(route),
	update: (model, message) => update(model, message),
	routeChanged: (model, route) => routeChanged(model, route),
	view,
	subscriptions,
	breadcrumbs: () => [],
})
