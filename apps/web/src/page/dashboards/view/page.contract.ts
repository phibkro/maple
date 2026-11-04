import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"DashboardView",
	{ Model, Message },
	{
		routes: ["Dashboard"],
		key: (route) => route.dashboardId,
	},
)
