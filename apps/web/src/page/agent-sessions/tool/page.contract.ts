import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"AgentSessionTool",
	{ Model, Message },
	{
		routes: ["AgentSessionTool"],
		key: (route) => `AgentSessionTool:${route.toolName}`,
	},
)
