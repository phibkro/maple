import { definePage } from "../contract"
import { Message } from "./message"
import { Model } from "./model"
import { subscriptions } from "./subscription"
import { contextChanged, init, revive, routeChanged, update } from "./update"
import { lazyPageView } from "../lazy-view"

/** `/`: the Overview home page. One instance per org; search changes arrive as `routeChanged`. */
const { view, loadView } = lazyPageView<Model, Message>(() => import("./view"))

export const page = definePage(
	"Overview",
	{ Model, Message },
	{
		routes: ["Home"],
		init,
		update,
		routeChanged,
		revive,
		contextChanged,
		view,
		loadView,
		subscriptions,
		breadcrumbs: () => [{ label: "Overview", isPageHeading: true }],
	},
)
