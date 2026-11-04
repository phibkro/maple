import { definePage } from "../../contract"
import { Message } from "./message"
import { Model } from "./model"
import { contextChanged, init, preload, routeChanged, update } from "./update"
import { lazyPageView } from "../../lazy-view"

/** `/replays`: session replays. One instance per org; search changes arrive as `routeChanged`. */
const { view, loadView } = lazyPageView<Model, Message>(() => import("./view"))

export const page = definePage(
	"ReplaysList",
	{ Model, Message },
	{
		routes: ["Replays"],
		init,
		preload,
		update,
		routeChanged,
		contextChanged,
		view,
		loadView,
		breadcrumbs: () => [{ label: "Replays", isPageHeading: true }],
	},
)
