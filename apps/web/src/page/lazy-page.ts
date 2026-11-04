import { Effect, Option, Schema } from "effect"
import { Command, Submodel, Subscription, type Update } from "foldkit"
import type { AppRoute, RouteTag } from "../route"
import { placeholderContent } from "./chrome"
import { button } from "@maple/views/ui/button"
import { typography } from "@maple/views/ui/typography"
import { vstack } from "@maple/views/ui/stack"
import type { Resources } from "../platform/resources"
import {
	definePage,
	type PageContext,
	type PageHost,
	type PageMessageBase,
	type PageSlotBase,
	type PageStep,
	type PageViewInputs,
} from "./contract"
import type { PageOutMessage } from "./contract"
import type { defineLazyPageContract, LazyPageInput } from "./lazy-page-contract"

class InvalidLazyPage extends Schema.TaggedError<InvalidLazyPage>()("@maple/web/InvalidLazyPage", {
	message: Schema.String,
}) {}

/** A new document clears the browser's failed native import records. */
export const ReloadLazyPage = Command.define("ReloadLazyPage", {
	messages: [],
	execute: Effect.sync(() => window.location.reload()).pipe(Effect.andThen(Effect.never)),
})

/** Adapts existing typed page implementations to a complete, application-owned lazy Submodel. */
export const createLazyPage = <
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
	options: {
		readonly buildId: string
		readonly load: () => Promise<
			Omit<
				ReturnType<
					typeof definePage<
						Id,
						Tag,
						Schema.Codec<Model, ModelEncoded>,
						Schema.Codec<Message, MessageEncoded>
					>
				>,
				"Slot" | "Wrapped"
			>
		>
	},
) => {
	type OriginalSlot = typeof contract.OriginalSlot.Type
	type OriginalMessage = typeof contract.OriginalWrapped.Type
	type Control = typeof contract.Control.Type
	type ChildReturn = Update.ReturnWithOutMessage<OriginalSlot, Control, PageOutMessage, Resources>
	const fromStep = (
		step: Option.Option<PageStep<OriginalSlot, OriginalMessage>>,
		fallback: OriginalSlot,
	): ChildReturn =>
		Option.match(step, {
			onNone: () => ({ model: fallback }),
			onSome: (found) => {
				const result = {
					model: found.slot,
					commands: Command.mapMessages(found.commands, (message) =>
						contract.Control.GotPageMessage({ message }),
					),
				}
				return Option.match(found.outMessage, {
					onNone: () => result,
					onSome: (outMessage) => ({ ...result, outMessage }),
				})
			},
		})
	const host = Submodel.lazy(contract.module, {
		buildId: options.buildId,
		load: async () => {
			const page = await options.load()
			if (page.capabilities.dataPreload)
				throw new InvalidLazyPage({
					message: `${contract.id}: data preloading requires a prepared-data protocol; keep this page eager until that protocol is implemented.`,
				})
			if (
				page.isRevivable !== (contract.routing.revivable === true) ||
				page.hasSource !== (contract.routing.hasSource === true)
			) {
				throw new InvalidLazyPage({
					message: `${contract.id}: declare revivable and hasSource in the eager page contract to match its implementation.`,
				})
			}
			const implementation = Submodel.implement(contract.module, {
				init: (input): ChildReturn => {
					const step = Option.getOrThrow(page.init(input.route, input.context, input.instance))
					return fromStep(Option.some(step), step.slot)
				},
				update: (model, message, input): ChildReturn =>
					contract.Control.match(message, {
						GotPageMessage: ({ message: inner }) =>
							fromStep(page.update(model, inner, input.context), model),
						ChangedRoute: () =>
							fromStep(page.routeChanged(model, input.route, input.context), model),
						ChangedContext: () => fromStep(page.contextChanged(model, input.context), model),
						SettledInfra: () => fromStep(page.infraSurfacesSettled(model, input.context), model),
						BlockedNavigation: ({ url }) =>
							fromStep(page.blockedNavigation(model, url, input.context), model),
					}),
				revive: (model, input): ChildReturn =>
					fromStep(
						Option.orElse(page.revive(model, input.route, input.context, input.instance), () =>
							page.init(input.route, input.context, input.instance),
						),
						model,
					),
				view: Submodel.defineView<OriginalSlot, Control, { readonly input: LazyPageInput }>(
					(model, { input }, h) =>
						h.submodel({
							slotId: contract.id,
							model,
							view: page.hostView,
							viewInputs: { context: input.context },
							toParentMessage: (message) => contract.Control.GotPageMessage({ message }),
						}),
				),
				subscriptions: Subscription.lift(page.subscriptions)<
					{ readonly model: OriginalSlot; readonly input: LazyPageInput },
					Control
				>({
					read: (state) => Option.some({ page: state.model, context: state.input.context }),
					toParentMessage: (message) => contract.Control.GotPageMessage({ message }),
				}),
			})
			return { ...implementation, page }
		},
	})
	type Slot = typeof contract.Slot.Type
	type Wrapped = typeof contract.Wrapped.Type
	type HostModel = typeof host.Model.Type
	type HostMessage = typeof host.Message.Type
	const isSlot = (slot: PageSlotBase): slot is Slot => slot._tag === contract.id
	const isMessage = (message: PageMessageBase): message is Wrapped => message._tag === contract.id
	const wrapFor =
		({ key, orgId, instance }: PageSlotBase) =>
		(message: HostMessage): Wrapped => ({
			_tag: contract.id,
			key,
			orgId,
			instance,
			message,
		})
	const childFor = ({ key, orgId, instance }: PageSlotBase) => {
		const toParent = wrapFor({ _tag: contract.id, key, orgId, instance })
		return (message: OriginalMessage): Wrapped =>
			toParent(
				host.Message.GotChildMessage({
					instance,
					buildId: options.buildId,
					message: contract.Control.GotPageMessage({ message }),
				}),
			)
	}
	const step = (
		slot: Slot,
		result: Update.ReturnWithOutMessage<HostModel, HostMessage, PageOutMessage, Resources>,
	): PageStep<Slot, Wrapped> => ({
		slot: result.model === slot.model ? slot : { ...slot, model: result.model },
		commands: Command.mapMessages(result.commands ?? [], wrapFor(slot)),
		outMessage: Option.map(Option.fromNullishOr(result.outMessage), (out) =>
			out._tag === "RequestedToast" &&
			out.action !== null &&
			out.action !== undefined &&
			Schema.is(contract.OriginalWrapped)(out.action.message)
				? {
						...out,
						action: {
							...out.action,
							message: childFor(slot)(out.action.message),
						},
					}
				: out,
		),
	})
	const reflect = (slot: Slot, route: AppRoute, context: PageContext, message: Control) => {
		const input = { route, context, instance: slot.instance }
		return slot.model._tag === "Ready"
			? step(
					slot,
					host.update(
						slot.model,
						host.Message.GotChildMessage({
							instance: slot.instance,
							buildId: options.buildId,
							message,
						}),
						input,
					),
				)
			: step(slot, { model: host.reflectInput(slot.model, input) })
	}
	const noStep = () => Option.none<PageStep<Slot, Wrapped>>()
	const Prefetch = Command.define(`Prefetch${contract.id}`, {
		messages: [host.Message.CompletedPrepare, host.Message.FailedPrepare],
		execute: host.prefetch().pipe(
			Effect.as(host.Message.CompletedPrepare({ instance: -1, attempt: 0, buildId: options.buildId })),
			Effect.orElseSucceed(() =>
				host.Message.FailedPrepare({
					instance: -1,
					attempt: 0,
					buildId: options.buildId,
					reason: "Prefetch failed",
				}),
			),
		),
	})
	let selected:
		| {
				readonly identity: string
				readonly record: Subscription.Subscriptions<PageHost, Wrapped, Resources>
		  }
		| undefined
	const dynamicSubscriptions = (
		parent: PageHost,
	): Subscription.Subscriptions<PageHost, Wrapped, Resources> => {
		if (parent.page === null || !isSlot(parent.page) || parent.page.model._tag !== "Ready") return {}
		const slot = parent.page
		const identity = `${slot.orgId}:${slot.key}:${slot.instance}`
		if (selected?.identity === identity) return selected.record
		const record = Subscription.lift(host.subscriptions(slot.model))<PageHost, Wrapped>({
			read: (parent) =>
				parent.page !== null && isSlot(parent.page) ? Option.some(parent.page.model) : Option.none(),
			toParentMessage: wrapFor(slot),
		})
		selected = { identity, record }
		return record
	}
	return {
		Prepare: host.Prepare,
		resume: (slot: PageSlotBase) => (isSlot(slot) ? step(slot, host.resume(slot.model)).commands : []),
		id: contract.id,
		routes: contract.routes,
		Slot: contract.Slot,
		Wrapped: contract.Wrapped,
		keyOf: contract.keyOf,
		isCompatible: (slot: PageSlotBase) => !isSlot(slot) || slot.model.buildId === options.buildId,
		isRevivable: contract.routing.revivable === true,
		hasSource: contract.routing.hasSource === true,
		init: (
			route: AppRoute,
			context: PageContext,
			instance: number,
		): Option.Option<PageStep<Slot, Wrapped>> =>
			Option.map(contract.keyOf(route), (key) => {
				const entered = host.enter({ route, context, instance }, instance)
				return step(
					{ _tag: contract.id, key, orgId: context.orgId, instance, model: entered.model },
					entered,
				)
			}),
		update: (slot: PageSlotBase, message: PageMessageBase, context: PageContext) =>
			isSlot(slot) &&
			isMessage(message) &&
			slot.instance === message.instance &&
			slot.key === message.key &&
			slot.orgId === message.orgId
				? Option.some(
						message.message._tag === "ClickedRetry" && slot.model._tag === "Failed"
							? { slot, commands: [ReloadLazyPage()], outMessage: Option.none() }
							: step(
									slot,
									host.update(slot.model, message.message, {
										...slot.model.input,
										context,
									}),
								),
					)
				: noStep(),
		routeChanged: (slot: PageSlotBase, route: AppRoute, context: PageContext) =>
			isSlot(slot)
				? Option.some(reflect(slot, route, context, contract.Control.ChangedRoute()))
				: noStep(),
		contextChanged: (slot: PageSlotBase, context: PageContext) =>
			isSlot(slot)
				? Option.some(
						reflect(slot, slot.model.input.route, context, contract.Control.ChangedContext()),
					)
				: noStep(),
		infraSurfacesSettled: (slot: PageSlotBase, context: PageContext) =>
			isSlot(slot)
				? Option.some(reflect(slot, slot.model.input.route, context, contract.Control.SettledInfra()))
				: noStep(),
		revive: (slot: PageSlotBase, route: AppRoute, context: PageContext, instance: number) =>
			isSlot(slot) &&
			contract.routing.revivable === true &&
			slot.model._tag === "Ready" &&
			slot.orgId === context.orgId &&
			Option.contains(contract.keyOf(route), slot.key)
				? Option.some(
						step(
							{ ...slot, instance },
							host.enter({ route, context, instance }, instance, slot.model),
						),
					)
				: noStep(),
		blockedNavigation: (slot: PageSlotBase, url: string, context: PageContext) =>
			isSlot(slot)
				? Option.flatMap(host.inspect(slot.model), (ready) =>
						Option.map(
							ready.implementation.page.blockedNavigation(ready.model, url, context),
							() =>
								step(
									slot,
									host.update(
										slot.model,
										host.Message.GotChildMessage({
											instance: slot.instance,
											buildId: options.buildId,
											message: contract.Control.BlockedNavigation({ url }),
										}),
										{ ...slot.model.input, context },
									),
								),
						),
					)
				: noStep(),
		source: (slot: PageSlotBase) =>
			isSlot(slot)
				? Option.match(host.inspect(slot.model), {
						onNone: () => null,
						onSome: (ready) => ready.implementation.page.source(ready.model),
					})
				: null,
		breadcrumbs: (slot: PageSlotBase) =>
			isSlot(slot)
				? Option.match(host.inspect(slot.model), {
						onNone: () => [],
						onSome: (ready) => ready.implementation.page.breadcrumbs(ready.model),
					})
				: [],
		preload: (route: AppRoute, context: PageContext) =>
			Option.map(contract.keyOf(route), (key) => [
				Command.mapMessage(
					Prefetch(),
					wrapFor({ _tag: contract.id, key, orgId: context.orgId, instance: -1 }),
				),
			]),
		subscriptions: {},
		dynamicSubscriptions,
		prefetch: host.prefetch,
		prepare: (slot: PageSlotBase) => (isSlot(slot) ? host.prepare(slot.model) : Effect.void),
		hostView: Submodel.defineView<PageSlotBase, Wrapped, PageViewInputs>((slot, inputs, h) => {
			if (!isSlot(slot)) return h.empty
			if (slot.model._tag === "Loading") return placeholderContent(h)
			if (slot.model._tag === "Failed")
				return vstack(h, { gap: "3", className: "p-4" }, [
					typography(h, { tone: "muted" }, ["Unable to load this page."]),
					typography(h, { size: "sm", tone: "muted" }, ["Retry reloads this page."]),
					button(h, { attributes: [h.OnClick(wrapFor(slot)(host.Message.ClickedRetry()))] }, [
						"Retry",
					]),
				])
			return Option.match(host.inspect(slot.model), {
				onNone: () => h.empty,
				onSome: (ready) =>
					h.submodel({
						slotId: `${contract.id}:${slot.instance}`,
						model: ready.model,
						view: ready.implementation.page.hostView,
						viewInputs: inputs,
						toParentMessage: childFor(slot),
					}),
			})
		}),
		hostTopbarActions: Submodel.defineView<PageSlotBase, Wrapped, PageViewInputs>((slot, inputs, h) =>
			!isSlot(slot)
				? null
				: Option.match(host.inspect(slot.model), {
						onNone: () => null,
						onSome: (ready) =>
							h.submodel({
								slotId: `${contract.id}:actions:${slot.instance}`,
								model: ready.model,
								view: ready.implementation.page.hostTopbarActions,
								viewInputs: inputs,
								toParentMessage: childFor(slot),
							}),
					}),
		),
	}
}
