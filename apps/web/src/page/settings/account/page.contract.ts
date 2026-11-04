import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"Account",
	{ Model, Message },
	{
		routes: ["Account"],
	},
)
