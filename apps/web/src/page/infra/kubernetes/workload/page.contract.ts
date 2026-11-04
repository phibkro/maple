import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraKubernetesWorkload",
	{ Model, Message },
	{
		routes: ["InfraKubernetesWorkload"],
		key: (route) => `${route.kind}/${route.workloadName}`,
		hasSource: true,
	},
)
