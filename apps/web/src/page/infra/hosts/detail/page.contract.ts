import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraHost",
	{ Model, Message },
	{
		routes: ["InfraHost"],
		key: (route) => route.hostName,
		hasSource: true,
	},
)
