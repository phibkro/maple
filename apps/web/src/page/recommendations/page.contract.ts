import { defineLazyPageContract } from "../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"Recommendation",
	{ Model, Message },
	{
		routes: ["Recommendation"],
		key: (route) => route.recommendationKey,
	},
)
