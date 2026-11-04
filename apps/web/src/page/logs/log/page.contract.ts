import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"Log",
	{ Model, Message },
	{
		routes: ["Log"],
		key: (route) => route.logId,
	},
)
