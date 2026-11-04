import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"IngestRuleEditor",
	{ Model, Message },
	{
		routes: ["IngestRuleNew", "IngestRule"],
		key: (route) => (route._tag === "IngestRule" ? route.ruleId : `new:${route.search.template ?? ""}`),
	},
)
