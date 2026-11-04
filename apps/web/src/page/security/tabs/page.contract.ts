import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"Security",
	{ Model, Message },
	{
		routes: ["SecurityCode", "SecurityCodeFindings", "SecurityCodeRuns"],
		key: () => "security",
	},
)
