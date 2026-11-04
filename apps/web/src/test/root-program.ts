/** One explicitly owned application scope per importing test file. */
import { createProgram } from "../main"
import { Effect } from "effect"
import { Message } from "../message"
import type { Model } from "../model"
import { preparationMessage } from "./prepared-registry"

export const program = createProgram({ buildId: "test" })
await Effect.runPromise(program.registry.prefetchAll())
const admit = (step: ReturnType<typeof program.update>): ReturnType<typeof program.update> => {
	const page = step.model.page
	const completion = page === null ? null : preparationMessage(page)
	if (completion === null || page === null) return step
	const prepared = program.update(step.model, Message.GotPageMessage({ message: completion }))
	return {
		model: prepared.model,
		commands: [
			...(step.commands ?? []).filter((command) => command.name !== `Prepare${page._tag}`),
			...(prepared.commands ?? []),
		],
	}
}
export const update = (model: Model, message: Message) => admit(program.update(model, message))
export const settle = (model: Model) => admit(program.updater.settle(model))
export const { view, subscriptions, dynamicSubscriptions, init } = program
export const { planGateOf, pageContextOf, onboardingInputsOf, shellClerkOf } = program.updater
export const { pages, enterRoute, updatePage, parkPages, preloadRoute, blockNavigation } = program.registry
export { PageSlot, PageMessage, pageIdentity, pageSlotId, isBarePageRoute } from "../page/registry"
