import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraKubernetesNode",
	{ Model, Message },
	{
		routes: ["InfraKubernetesNode"],
		key: (route) => route.nodeName,
		hasSource: true,
	},
)
