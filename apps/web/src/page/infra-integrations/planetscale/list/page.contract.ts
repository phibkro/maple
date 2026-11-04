import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"InfraPlanetscale",
	{ Model, Message },
	{
		routes: ["InfraPlanetscale"],
		hasSource: true,
	},
)
