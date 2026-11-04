import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"InfraGcp",
	{ Model, Message },
	{
		routes: ["InfraGcp"],
		hasSource: true,
	},
)
