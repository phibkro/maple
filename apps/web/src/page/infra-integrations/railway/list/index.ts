import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/railway`: Railway services, or the connect card while no token is saved. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	source: () => platformSource("railway"),
	breadcrumbs: () => [{ label: "Infrastructure", href: "/infra" }, { label: "Railway" }],
})
