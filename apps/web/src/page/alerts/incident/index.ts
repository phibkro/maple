import { implementPage } from "../../lazy-page-contract"
import { contract } from "./page.contract"
import { Schema } from "effect"
import { Subscription } from "foldkit"
import type { Resources } from "../../../platform/resources"
import { type PageSubscriptionInput } from "../../contract"
import { incidentRows, ruleRows, ruleStateRows } from "../shared/collections"
import { Message } from "./message"
import { Model } from "./model"
import { init, update } from "./update"
import { breadcrumbsOf, view } from "./view"

const byOrg = { orgId: Schema.String }

const subscriptions = Subscription.make<PageSubscriptionInput<Model>, Message, Resources>()((entry) => ({
	incidents: entry(byOrg, {
		modelToDependencies: ({ context }) => ({ orgId: context.orgId }),
		dependenciesToStream: ({ orgId }) =>
			incidentRows(orgId, (rows) => Message.UpdatedIncidents({ orgId, rows })),
	}),
	rules: entry(byOrg, {
		modelToDependencies: ({ context }) => ({ orgId: context.orgId }),
		dependenciesToStream: ({ orgId }) => ruleRows(orgId, (rows) => Message.UpdatedRules({ orgId, rows })),
	}),
	states: entry(byOrg, {
		modelToDependencies: ({ context }) => ({ orgId: context.orgId }),
		dependenciesToStream: ({ orgId }) =>
			ruleStateRows(orgId, (rows) => Message.UpdatedRuleStates({ orgId, rows })),
	}),
}))

/** `/alerts/incidents/$incidentId`: one instance per incident. */
export const page = implementPage(contract, {
	init,
	update,
	view,
	subscriptions,
	breadcrumbs: breadcrumbsOf,
})
