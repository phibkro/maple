import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraRailwayService",
	{ Model, Message },
	{
		routes: ["InfraRailwayService"],
		key: (route) => `InfraRailwayService:${route.serviceId}`,
		hasSource: true,
	},
)
