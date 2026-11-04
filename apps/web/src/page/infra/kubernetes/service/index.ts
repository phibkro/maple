import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { kubernetesBreadcrumbs } from "../../kit/view-tabs"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/**
 * `/infra/kubernetes/services` and `/infra/kubernetes/services/$serviceName`: the service lens. One
 * instance spans both, so picking a service keeps the rail.
 */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: (model) =>
		kubernetesBreadcrumbs(
			"services",
			model.search,
			model.serviceName === null ? [] : [{ label: model.serviceName }],
		),
})
