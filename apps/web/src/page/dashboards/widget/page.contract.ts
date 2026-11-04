import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"DashboardWidget",
	{ Model, Message },
	{
		routes: ["DashboardWidget"],
		key: (route) => `${route.dashboardId}/${route.widgetId}`,
	},
)
