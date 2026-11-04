import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model, Message } from "./model"

export const contract = defineLazyPageContract(
	"SecurityTelemetry",
	{ Model, Message },
	{
		routes: ["SecurityExposure", "SecurityRuntimes"],
		key: () => "security-telemetry",
	},
)
