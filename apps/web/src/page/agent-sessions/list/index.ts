import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/agent-sessions`: the sessions list. Search changes arrive as `routeChanged` and keep the window. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	breadcrumbs: () => [{ label: "Agent sessions", isPageHeading: true }],
})
