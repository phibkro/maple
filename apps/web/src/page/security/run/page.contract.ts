import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"SecurityRun",
	{ Model, Message },
	{
		routes: ["SecurityRun"],
		key: (route) => route.runId,
	},
)
