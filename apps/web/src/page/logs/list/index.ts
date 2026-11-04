import { definePage } from "../../contract"
import { Message } from "./message"
import { Model } from "./model"
import { subscriptions } from "./subscription"
import { contextChanged, init, routeChanged, update } from "./update"
import { lazyPageView } from "../../lazy-view"

/** `/logs`: the logs stream. One instance per org; search changes arrive as `routeChanged`. */
const { view, loadView } = lazyPageView<Model, Message>(() => import("./view"))

export const page = definePage(
	"LogsList",
	{ Model, Message },
	{
		routes: ["Logs"],
		init,
		update,
		routeChanged,
		contextChanged,
		view,
		loadView,
		subscriptions,
		breadcrumbs: () => [{ label: "Logs", isPageHeading: true }],
	},
)
