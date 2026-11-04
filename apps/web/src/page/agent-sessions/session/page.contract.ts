import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"AgentSession",
	{ Model, Message },
	{
		routes: ["AgentSession"],
		key: (route) => `AgentSession:${route.sessionId}`,
	},
)
