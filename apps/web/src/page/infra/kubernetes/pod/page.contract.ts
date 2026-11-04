import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraKubernetesPod",
	{ Model, Message },
	{
		routes: ["InfraKubernetesPod"],
		key: (route) => route.podName,
		hasSource: true,
	},
)
