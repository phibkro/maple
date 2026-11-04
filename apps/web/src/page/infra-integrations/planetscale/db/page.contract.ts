import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"InfraPlanetscaleDatabase",
	{ Model, Message },
	{
		routes: ["InfraPlanetscaleDatabase"],
		key: (route) => `InfraPlanetscaleDatabase:${route.dbName}`,
		hasSource: true,
	},
)
