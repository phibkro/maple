import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"InfraCloudflareWorker",
	{ Model, Message },
	{
		routes: ["InfraCloudflareWorker"],
		key: (route) => `InfraCloudflareWorker:${route.scriptName}`,
		hasSource: true,
	},
)
