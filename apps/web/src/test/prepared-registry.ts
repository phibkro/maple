import { Effect, Schema } from "effect"
import { contracts } from "../page/lazy-catalog.generated"
import {
	createPageRegistry,
	PageMessage,
	PageSlot,
	type PageRegistry,
	type PageTransition,
} from "../page/registry"
import { LazyPageInput } from "../page/lazy-page-contract"
import type { PageContext, PageSlotBase } from "../page/contract"
import type { AppRoute } from "../route"

const lazyIds = new Set<string>(contracts.map((contract) => contract.id))
const Pending = Schema.Struct({
	_tag: Schema.Literal("Loading"),
	instance: Schema.Number,
	attempt: Schema.Number,
	buildId: Schema.String,
	input: LazyPageInput,
})

/** A test driver resolves preparation only after the real implementation has been prepared. */
export const preparationMessage = (slot: PageSlot): PageMessage | null => {
	if (!lazyIds.has(slot._tag) || !Schema.is(Pending)(slot.model)) return null
	const candidate = {
		_tag: slot._tag,
		key: slot.key,
		orgId: slot.orgId,
		instance: slot.instance,
		message: {
			_tag: "CompletedPrepare",
			instance: slot.instance,
			attempt: slot.model.attempt,
			buildId: slot.model.buildId,
		},
	}
	if (!Schema.is(PageMessage)(candidate)) throw new Error("Invalid test preparation Message")
	return candidate
}

export const childMessage = (slot: PageSlotBase, message: unknown): PageMessage => {
	const original = { _tag: slot._tag, key: slot.key, orgId: slot.orgId, instance: slot.instance, message }
	const candidate = lazyIds.has(slot._tag)
		? {
				...original,
				message: {
					_tag: "GotChildMessage",
					instance: slot.instance,
					buildId: "test",
					message: { _tag: "GotPageMessage", message: original },
				},
			}
		: original
	if (!Schema.is(PageMessage)(candidate)) throw new Error(`Invalid test child Message for ${slot._tag}`)
	return candidate
}

export const readySlot = (
	original: PageSlotBase & { readonly model: unknown },
	route: AppRoute,
	context: PageContext,
): PageSlot => {
	const candidate = lazyIds.has(original._tag)
		? {
				...original,
				model: {
					_tag: "Ready",
					instance: original.instance,
					attempt: 0,
					buildId: "test",
					input: { route, context, instance: original.instance },
					model: original,
				},
			}
		: original
	if (!Schema.is(PageSlot)(candidate)) throw new Error(`Invalid test child Model for ${original._tag}`)
	return candidate
}

export const admitPrepared = (
	registry: PageRegistry,
	transition: PageTransition,
	context: PageContext,
): PageTransition => {
	const completion = transition.slot === null ? null : preparationMessage(transition.slot)
	return completion === null ? transition : registry.updatePage(transition.slot, completion, context)
}

export const createPreparedRegistry = async () => {
	const registry = createPageRegistry({ buildId: "test" })
	await Effect.runPromise(registry.prefetchAll())
	return {
		...registry,
		enterRoute: (...args: Parameters<typeof registry.enterRoute>) =>
			admitPrepared(registry, registry.enterRoute(...args), args[2]),
	}
}
