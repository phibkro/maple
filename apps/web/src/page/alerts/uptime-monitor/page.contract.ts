import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"AlertsUptimeMonitor",
	{ Model, Message },
	{
		routes: ["AlertsUptimeMonitor"],
		key: (route) => route.monitorId,
	},
)
