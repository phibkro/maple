import type { GcpColumn } from "../../components/infra/gcp/tabs"
import { BAR_VALUE_TONE } from "../../components/infra/severity-tokens"
import { errorRateClass } from "@maple/ui/lib/error-rate"
import { utilizationLevel } from "@maple/ui/lib/utilization"

/** The value tone for a GCP metric column, shared by fleet and connection views. */
export const valueClass = (spec: GcpColumn, value: number | undefined): string => {
	if (value !== undefined && spec.format === "errorRate") return errorRateClass(value)
	if (value !== undefined && spec.format === "percent" && utilizationLevel(value) !== "ok") {
		return BAR_VALUE_TONE[utilizationLevel(value)]
	}
	return "text-foreground-soft"
}
