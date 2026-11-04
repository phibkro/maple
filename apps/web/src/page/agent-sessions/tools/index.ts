import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/agent-sessions/tools`: every tool the window's agents called. Search changes arrive as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: () => [{ label: "Agent sessions", href: "/agent-sessions" }, { label: "Tools" }],
})
