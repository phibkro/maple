import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { view } from "./view"

/** `/dashboards/$dashboardId`: one instance per dashboard; `mode=edit` and view params are search. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	subscriptions,
	breadcrumbs: (model) => [
		{ label: "Dashboards", href: "/dashboards" },
		{
			label:
				model.status === "Loading"
					? "Loading…"
					: model.document === null
						? "Not found"
						: model.document.name,
		},
	],
})
