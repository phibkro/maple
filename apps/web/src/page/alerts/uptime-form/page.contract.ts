import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"AlertsUptimeNew",
	{ Model, Message },
	{
		routes: ["AlertsUptimeNew"],
		key: (route) => route.search.monitorId ?? "new",
	},
)
