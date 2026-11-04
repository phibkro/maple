import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraContainer",
	{ Model, Message },
	{
		routes: ["InfraContainer"],
		key: (route) => route.containerName,
		hasSource: true,
	},
)
