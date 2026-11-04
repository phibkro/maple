import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"SecurityFinding",
	{ Model, Message },
	{
		routes: ["SecurityFinding"],
		key: (route) => `${route.targetId}/${route.fingerprint}`,
	},
)
