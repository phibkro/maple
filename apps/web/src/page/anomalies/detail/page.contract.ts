import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"Anomaly",
	{ Model, Message },
	{
		routes: ["Anomaly"],
		key: (route) => route.incidentId,
	},
)
