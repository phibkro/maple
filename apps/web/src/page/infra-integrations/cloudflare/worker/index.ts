import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { platformSource } from "../../../../shell/source-link"

/** `/infra/cloudflare/workers/$scriptName`: one Worker; another script is another instance. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	subscriptions,
	source: () => platformSource("cloudflare"),
	breadcrumbs: (model) => [
		{ label: "Infrastructure", href: "/infra" },
		{ label: "Cloudflare", href: "/infra/cloudflare?view=workers" },
		{ label: model.scriptName },
	],
})
