import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/planetscale`: the database fleet, or the connect prompt. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: () => platformSource("planetscale"),
	breadcrumbs: () => [{ label: "Infrastructure", href: "/infra" }, { label: "PlanetScale" }],
})
