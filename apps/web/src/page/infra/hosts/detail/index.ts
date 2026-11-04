import { implementPage } from "../../../lazy-page-contract"
import { contract } from "./page.contract"

import { contextChanged, init, routeChanged, update } from "./update"
import { view } from "./view"
import { summarySource } from "../../../../shell/source-link"

/** `/infra/hosts/$hostName`: one instance per host; a window change arrives as `routeChanged`. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	contextChanged,
	view,
	source: (model) => summarySource(model.summary.data),
	breadcrumbs: (model) => [
		{ label: "Infrastructure", href: "/infra" },
		{ label: "Hosts", href: "/infra/hosts" },
		{ label: model.hostName },
	],
})
