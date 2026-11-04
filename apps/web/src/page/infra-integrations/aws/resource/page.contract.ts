import { defineLazyPageContract } from "../../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"InfraAwsResource",
	{ Model, Message },
	{
		routes: ["InfraAwsResource"],
		key: (route) =>
			`InfraAwsResource:${route.kind}:${route.name}:${route.search.cluster ?? ""}:${route.search.region ?? ""}:${route.search.account ?? ""}`,
		hasSource: true,
	},
)
