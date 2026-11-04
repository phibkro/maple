import { definePage } from "../../contract"
import { Message } from "./message"
import { Model } from "./model"
import { contextChanged, init, routeChanged, update } from "./update"
import { lazyPageView } from "../../lazy-view"

/** `/services/$serviceName`: one instance per service; tab, environment and window changes are `routeChanged`. */
const { view, loadView } = lazyPageView<Model, Message>(() => import("./view"))

export const page = definePage(
	"ServiceDetail",
	{ Model, Message },
	{
		routes: ["Service"],
		key: (route) => route.serviceName,
		init,
		update,
		routeChanged,
		contextChanged,
		view,
		loadView,
		breadcrumbs: (model) => [{ label: "Services", href: "/services" }, { label: model.serviceName }],
	},
)
