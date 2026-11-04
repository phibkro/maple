import { defineLazyPageContract } from "../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"Share",
	{ Model, Message },
	{
		routes: ["Share"],
		key: (route) => route.token,
	},
)
