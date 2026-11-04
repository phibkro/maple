import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"AlertIncident",
	{ Model, Message },
	{
		routes: ["AlertIncident"],
		key: (route) => route.incidentId,
	},
)
