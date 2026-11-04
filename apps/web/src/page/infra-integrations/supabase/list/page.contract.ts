import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraSupabase",
	{ Model, Message },
	{
		routes: ["InfraSupabase"],
		hasSource: true,
	},
)
