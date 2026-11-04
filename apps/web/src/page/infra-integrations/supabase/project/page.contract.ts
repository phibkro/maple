import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraSupabaseProject",
	{ Model, Message },
	{
		routes: ["InfraSupabaseProject"],
		key: (route) => `InfraSupabaseProject:${route.projectRef}`,
		hasSource: true,
	},
)
