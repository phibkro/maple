import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"ErrorIssue",
	{ Model, Message },
	{
		routes: ["ErrorIssue"],
		key: (route) => route.issueId,
	},
)
