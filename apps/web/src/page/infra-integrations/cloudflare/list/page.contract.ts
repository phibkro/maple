import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"InfraCloudflare",
	{ Model, Message },
	{
		routes: ["InfraCloudflare"],
		hasSource: true,
	},
)
