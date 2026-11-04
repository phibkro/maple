import { defineLazyPageContract } from "../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"Overview",
	{ Model, Message },
	{
		routes: ["Home"],
		revivable: true,
	},
)
