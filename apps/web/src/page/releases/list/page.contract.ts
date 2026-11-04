import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"ReleasesList",
	{ Model, Message },
	{
		routes: ["Releases"],
	},
)
