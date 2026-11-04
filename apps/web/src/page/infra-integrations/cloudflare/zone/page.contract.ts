import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"InfraCloudflareZone",
	{ Model, Message },
	{
		routes: ["InfraCloudflareZone"],
		key: (route) => `InfraCloudflareZone:${route.zoneName}`,
		hasSource: true,
	},
)
