import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"McpServers",
	{ Model, Message },
	{
		routes: ["McpServers", "McpServer", "McpServerTool", "McpServerSessions", "McpServerSession"],
		key: () => "mcp-servers",
	},
)
