import { defineLazyPageContract } from "../../lazy-page-contract"
import { Model } from "./model"
import { Message } from "./message"

export const contract = defineLazyPageContract(
	"MetricDetail",
	{ Model, Message },
	{
		routes: ["Metric"],
		key: (route) => `Metric:${route.metricName}`,
	},
)
