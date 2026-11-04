import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/aws`: the connected accounts' streamed resources, or the on-ramp while none sends any. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: () => platformSource("aws"),
	breadcrumbs: () => [{ label: "Infrastructure", href: "/infra" }, { label: "AWS" }],
})
