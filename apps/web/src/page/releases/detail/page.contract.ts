import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"Release",
	{ Model, Message },
	{
		routes: ["Release"],
		key: (route) => route.commitSha,
	},
)
