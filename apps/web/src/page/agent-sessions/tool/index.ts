import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { subscriptions } from "./subscription"
import { view } from "./view"

/** `/agent-sessions/tools/$toolName`: one tool's charts, failures and sessions. One instance per tool. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	breadcrumbs: (model) => [
		{ label: "Agent sessions", href: "/agent-sessions" },
		{ label: "Tools", href: "/agent-sessions/tools" },
		{ label: model.toolName },
	],
})
