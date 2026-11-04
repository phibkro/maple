import { DashboardDocument } from "@maple/domain/http"
import type { V2Dashboard } from "@maple/domain/http/v2"
import { Schema } from "effect"

const decodeDocument = Schema.decodeUnknownEffect(DashboardDocument)

/** A version's snapshot read as the board document the canvas renders. */
export const documentOf = (snapshot: V2Dashboard) =>
	decodeDocument({
		id: snapshot.id,
		name: snapshot.name,
		...(snapshot.description === null ? undefined : { description: snapshot.description }),
		tags: snapshot.tags,
		timeRange: snapshot.timeRange,
		widgets: snapshot.widgets,
		sections: snapshot.sections,
		variables: snapshot.variables,
		...(snapshot.refreshIntervalSeconds === null
			? undefined
			: { refreshIntervalSeconds: snapshot.refreshIntervalSeconds }),
		createdAt: snapshot.createdAt,
		updatedAt: snapshot.updatedAt,
	})
