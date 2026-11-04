import { OrgId } from "@maple/domain"
import { InfraSurfaceLiteral } from "@maple/domain/http"
import { Option, Schema } from "effect"
import { Submodel } from "foldkit"
import { defineMessageUnion } from "foldkit/message"
import { AppRoute, type RouteTag } from "../route"
import { NavSurface } from "../shell/nav"
import { definePage, PageOutMessage, type PageSpec } from "./contract"

const Context = Schema.Struct({
	orgId: OrgId,
	pinnedNamespace: Schema.NullOr(Schema.String),
	timeZone: Schema.String,
	infra: Schema.optionalKey(
		Schema.Struct({
			presence: Schema.NullOr(Schema.Array(InfraSurfaceLiteral)),
			isPresenceFailed: Schema.Boolean,
			integrations: Schema.Struct({
				cloudflare: Schema.NullOr(Schema.Boolean),
				railway: Schema.NullOr(Schema.Boolean),
				planetscale: Schema.NullOr(Schema.Boolean),
				gcp: Schema.NullOr(Schema.Boolean),
				supabase: Schema.NullOr(Schema.Boolean),
				aws: Schema.NullOr(Schema.Boolean),
			}),
			remembered: Schema.UndefinedOr(Schema.Array(NavSurface)),
		}),
	),
})

export const LazyPageInput = Schema.Struct({ route: AppRoute, context: Context, instance: Schema.Number })
export type LazyPageInput = typeof LazyPageInput.Type

/** Eager route identity and schemas. This module must not import the page implementation. */
export const defineLazyPageContract = <
	const Id extends string,
	Model,
	ModelEncoded,
	Message,
	MessageEncoded,
	const Tag extends RouteTag,
>(
	id: Id,
	schemas: {
		readonly Model: Schema.Codec<Model, ModelEncoded>
		readonly Message: Schema.Codec<Message, MessageEncoded, unknown, unknown>
	},
	routing: {
		readonly routes: ReadonlyArray<Tag>
		readonly revivable?: boolean
		readonly hasSource?: boolean
		readonly key?: (route: Extract<AppRoute, { readonly _tag: Tag }>) => string
	},
) => {
	const OriginalSlot = Schema.TaggedStruct(id, {
		key: Schema.String,
		orgId: Schema.String,
		instance: Schema.Number,
		model: schemas.Model,
	})
	const OriginalWrapped = Schema.TaggedStruct(id, {
		key: Schema.String,
		orgId: Schema.String,
		instance: Schema.Number,
		message: schemas.Message,
	})
	const Control = defineMessageUnion({
		GotPageMessage: { message: OriginalWrapped },
		ChangedRoute: {},
		ChangedContext: {},
		SettledInfra: {},
		BlockedNavigation: { url: Schema.String },
	})
	const module = Submodel.contract(id, {
		Model: OriginalSlot,
		Message: Control,
		Input: LazyPageInput,
		OutMessage: PageOutMessage,
	})
	const Slot = Schema.TaggedStruct(id, {
		key: Schema.String,
		orgId: Schema.String,
		instance: Schema.Number,
		model: module.host.Model,
	})
	const Wrapped = Schema.TaggedStruct(id, {
		key: Schema.String,
		orgId: Schema.String,
		instance: Schema.Number,
		message: module.host.Message,
	})
	return {
		id,
		module,
		Slot,
		Wrapped,
		OriginalSlot,
		OriginalWrapped,
		Control,
		schemas,
		routing,
		routes: routing.routes,
		keyOf: (route: AppRoute): Option.Option<string> => {
			// The schema narrows route ownership before the page-specific key is evaluated.
			const owns = (candidate: AppRoute): candidate is Extract<AppRoute, { readonly _tag: Tag }> =>
				routing.routes.some((tag) => tag === candidate._tag)
			return owns(route) ? Option.some(routing.key ? routing.key(route) : route._tag) : Option.none()
		},
	}
}

/** The contract is the single source for identity, schemas and route ownership. */
export const implementPage = <
	const Id extends string,
	Model,
	ModelEncoded,
	Message,
	MessageEncoded,
	Tag extends RouteTag,
>(
	contract: ReturnType<
		typeof defineLazyPageContract<Id, Model, ModelEncoded, Message, MessageEncoded, Tag>
	>,
	spec: Omit<PageSpec<Tag, Model, Message>, "routes" | "key">,
) =>
	definePage(contract.id, contract.schemas, {
		...spec,
		routes: contract.routes,
		key: contract.routing.key,
	})
