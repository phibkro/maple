import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/cloudflare`: zones, Workers and queues, or why there are none yet. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	source: () => platformSource("cloudflare"),
	breadcrumbs: () => [{ label: "Infrastructure", href: "/infra" }, { label: "Cloudflare" }],
})
