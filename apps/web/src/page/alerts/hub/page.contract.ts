import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"AlertsHub",
	{ Model, Message },
	{
		routes: ["Alerts"],
	},
)
