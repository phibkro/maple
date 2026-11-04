import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"

import { update } from "./page-update"
import { subscriptions } from "./subscription"
import { askToLeave, init, isBlockingNavigation, routeChanged, widgetOf } from "./update"
import { topbarActions, view } from "./view"

/** `/dashboards/$dashboardId/widgets/$widgetId`: one instance per widget. */
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	view,
	topbarActions,
	subscriptions,
	isBlockingNavigation,
	blockedNavigation: (model, url) => askToLeave(model, url),
	breadcrumbs: (model) =>
		model.document !== null && widgetOf(model) !== null
			? [
					{ label: "Dashboards", href: "/dashboards" },
					{ label: model.document.name, href: `/dashboards/${model.dashboardId}` },
					{ label: "Configure widget" },
				]
			: [
					{ label: "Dashboards", href: "/dashboards" },
					{ label: model.status === "Loading" ? "Loading…" : "Not found" },
				],
})
