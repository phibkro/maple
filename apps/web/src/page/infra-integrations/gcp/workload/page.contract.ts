import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"InfraGcpResource",
	{ Model, Message },
	{
		routes: ["InfraGcpResource"],
		key: (route) => `InfraGcpResource:${route.service}:${route.name}`,
		hasSource: true,
	},
)
