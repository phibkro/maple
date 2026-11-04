import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/infra/containers`: the container fleet. Search changes arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: () => [{ label: "Infrastructure", href: "/infra" }, { label: "Containers" }],
})
