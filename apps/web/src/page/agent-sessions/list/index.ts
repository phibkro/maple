import { definePage } from "../../contract"
import { Message } from "./message"
import { Model } from "./model"
import { contextChanged, init, routeChanged, update } from "./update"
import { lazyPageView } from "../../lazy-view"

/** `/agent-sessions`: the sessions list. Search changes arrive as `routeChanged` and keep the window. */
const { view, loadView } = lazyPageView<Model, Message>(() => import("./view"))

export const page = definePage(
	"AgentSessionsList",
	{ Model, Message },
	{
		routes: ["AgentSessions"],
		init,
		update,
		routeChanged,
		contextChanged,
		view,
		loadView,
		breadcrumbs: () => [{ label: "Agent sessions", isPageHeading: true }],
	},
)
