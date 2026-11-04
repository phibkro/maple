import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/services/$serviceName`: one instance per service; tab, environment and window changes are `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: (model) => [{ label: "Services", href: "/services" }, { label: model.serviceName }],
})
