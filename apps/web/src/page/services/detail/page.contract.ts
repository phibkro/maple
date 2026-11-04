import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"ServiceDetail",
	{ Model, Message },
	{
		routes: ["Service"],
		key: (route) => route.serviceName,
	},
)
