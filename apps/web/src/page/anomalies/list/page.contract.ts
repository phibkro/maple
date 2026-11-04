import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"AnomaliesList",
	{ Model, Message },
	{
		routes: ["Anomalies"],
	},
)
