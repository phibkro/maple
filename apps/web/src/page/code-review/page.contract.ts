import { defineLazyPageContract } from "../lazy-page-contract"
import { Model, Message } from "./tabs"

export const contract = defineLazyPageContract(
	"CodeReview",
	{ Model, Message },
	{
		routes: [
			"CodeReview",
			"CodeReviewPullRequests",
			"CodeReviewCi",
			"CodeReviewTeam",
			"CodeReviewIssues",
			"CodeReviewSettings",
		],
		key: () => "code-review",
	},
)
