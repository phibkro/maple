import { OrgId } from "@maple/domain"
import { Effect, Fiber, Option, Schema } from "effect"
import { expect as expectView, given, role, scene } from "foldkit/scene"
import { describe, expect, test, vi } from "vitest"
import { AppRoute } from "../route"
import type { PageContext } from "./contract"
import { contract } from "./dashboards/list/page.contract"
import { page as original } from "./dashboards/list"
import { Message as DashboardMessage } from "./dashboards/list/message"
import { createLazyPage, ReloadLazyPage } from "./lazy-page"

const context: PageContext = {
	orgId: Schema.decodeSync(OrgId)("org_test"),
	pinnedNamespace: null,
	timeZone: "UTC",
}
const route = AppRoute.Dashboards({ search: {} })
const buildId = "test"
const makePage = () => createLazyPage(contract, { buildId, load: () => Promise.resolve(original) })
type Page = ReturnType<typeof makePage>
type Slot = typeof contract.Slot.Type
type Wrapped = typeof contract.Wrapped.Type

const stamp = (slot: Slot, message: typeof contract.module.host.Message.Type): Wrapped => ({
	_tag: contract.id,
	key: slot.key,
	orgId: slot.orgId,
	instance: slot.instance,
	message,
})
const complete = async (page: Page, slot: Slot) => {
	await Effect.runPromise(page.prefetch())
	return Option.getOrThrow(
		page.update(
			slot,
			stamp(
				slot,
				contract.module.host.Message.CompletedPrepare({
					instance: slot.instance,
					attempt: slot.model.attempt,
					buildId,
				}),
			),
			slot.model.input.context,
		),
	)
}

describe("Maple complete lazy page integration", () => {
	test("admits the original init, update, Commands and typed child Model after loading", async () => {
		const page = makePage()
		const pending = Option.getOrThrow(page.init(route, context, 1))
		expect(pending.slot.model._tag).toBe("Loading")
		const ready = await complete(page, pending.slot)
		const expected = Option.getOrThrow(original.init(route, context, 1))
		expect(ready.slot.model._tag === "Ready" && ready.slot.model.model).toEqual(expected.slot)
		expect(ready.commands.map((command) => command.name)).toEqual(
			expected.commands.map((command) => command.name),
		)
		const sent = stamp(
			ready.slot,
			contract.module.host.Message.GotChildMessage({
				instance: 1,
				buildId,
				message: contract.Control.GotPageMessage({
					message: {
						_tag: expected.slot._tag,
						key: expected.slot.key,
						orgId: expected.slot.orgId,
						instance: expected.slot.instance,
						message: DashboardMessage.CompletedReadClock({ nowMs: 42, locale: "en-US" }),
					},
				}),
			}),
		)
		const updated = Option.getOrThrow(page.update(ready.slot, sent, context))
		expect(updated.slot.model).toMatchObject({ _tag: "Ready", model: { model: { nowMs: 42 } } })
		expect(
			Schema.decodeUnknownSync(contract.Slot)(Schema.encodeSync(contract.Slot)(updated.slot)),
		).toEqual(updated.slot)
	})

	test("keeps the latest parent context during loading and drops an older instance's completion", async () => {
		const page = makePage()
		const old = Option.getOrThrow(page.init(route, context, 1)).slot
		const current = Option.getOrThrow(page.init(route, context, 3)).slot
		const changed = Option.getOrThrow(
			page.contextChanged(current, { ...context, timeZone: "Europe/Oslo" }),
		).slot
		await Effect.runPromise(page.prefetch())
		const late = page.update(
			changed,
			stamp(old, contract.module.host.Message.CompletedPrepare({ instance: 1, attempt: 0, buildId })),
			context,
		)
		expect(Option.isNone(late)).toBe(true)
		const ready = await complete(page, changed)
		expect(ready.slot.model).toMatchObject({
			_tag: "Ready",
			instance: 3,
			input: { context: { timeZone: "Europe/Oslo" } },
		})
	})

	test("reloads the document through a Command when the reader retries a failed native import", async () => {
		const page = makePage()
		const pending = Option.getOrThrow(page.init(route, context, 1)).slot
		const failed = Option.getOrThrow(
			page.update(
				pending,
				stamp(
					pending,
					contract.module.host.Message.FailedPrepare({
						instance: 1,
						attempt: 0,
						buildId,
						reason: "offline",
					}),
				),
				context,
			),
		).slot
		scene(
			{
				update: (slot: Slot, message: Wrapped) => {
					const step = Option.getOrThrow(page.update(slot, message, context))
					return { model: step.slot, commands: step.commands }
				},
				view: (slot, h) =>
					h.submodel({
						slotId: "lazy-page",
						model: slot,
						view: page.hostView,
						viewInputs: { context },
						toParentMessage: (message) => message,
					}),
			},
			given(failed),
			expectView(role("button", { name: "Retry" })).toExist(),
		)
		const retry = Option.getOrThrow(
			page.update(failed, stamp(failed, contract.module.host.Message.ClickedRetry()), context),
		)
		expect(retry.slot).toBe(failed)
		const reload = vi.fn()
		vi.stubGlobal("window", { location: { reload } })
		expect(retry.commands.map((command) => command.name)).toEqual(["ReloadLazyPage"])
		const fiber = Effect.runFork(ReloadLazyPage().effect)
		try {
			await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
		} finally {
			await Effect.runPromise(Fiber.interrupt(fiber))
			vi.unstubAllGlobals()
		}
	})
})
