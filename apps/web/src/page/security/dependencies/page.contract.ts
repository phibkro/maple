import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"SecurityDependencies",
	{ Model, Message },
	{
		routes: ["SecurityDependencies"],
		key: () => "security-dependencies",
	},
)
