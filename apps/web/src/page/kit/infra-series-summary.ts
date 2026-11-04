import type { Html, HtmlBuilder } from "foldkit/html"
import type * as Chart from "@maple/views/charts/chart"
import type { InfraSeriesInfo } from "@maple/views/charts/infra-metric-chart"
import { middleTruncate } from "@maple/views/ui/middle-truncate"
import { formatValueWithUnit } from "@maple/views/lib/infra-chart-units"
import { Array as Arr } from "effect"
import { seriesLegend } from "./series-legend"

/** `HostSeriesSummary`: the right-aligned last-value strip. */
export const hostSeriesSummary = (h: HtmlBuilder<Chart.Message>, info: InfraSeriesInfo): Html =>
	seriesLegend(h, {
		className: "px-3 py-2",
		maxItems: 8,
		items: Arr.map(info.series, (name) => {
			const value = info.lastValues[name]
			const label = info.labelFor(name)
			return {
				key: name,
				label: middleTruncate(h, { text: label, tail: 10 }),
				title: label,
				color: info.colors.get(name),
				value: value === undefined ? undefined : formatValueWithUnit(value, info.unit),
			}
		}),
	})
