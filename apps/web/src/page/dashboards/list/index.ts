import { definePage } from "../../contract"
import { Message } from "./message"
import { Model } from "./model"
import { subscriptions } from "./subscription"
import { init, routeChanged, update } from "./update"
import { lazyPageView } from "../../lazy-view"

/** `/dashboards`: the org's dashboards. One instance per org; search changes arrive as `routeChanged`. */
const { view, loadView } = lazyPageView<Model, Message>(() => import("./view"))

export const page = definePage(
	"DashboardsList",
	{ Model, Message },
	{
		routes: ["Dashboards"],
		init,
		update,
		routeChanged,
		view,
		loadView,
		subscriptions,
		breadcrumbs: () => [{ label: "Dashboards", isPageHeading: true }],
	},
)
