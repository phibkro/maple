import { contracts, createCatalog } from "./lazy-catalog.generated"
import { Array, Effect, Option, Predicate, Schema, Record as Rec } from "effect"
import { Subscription } from "foldkit"
import type { Command } from "foldkit"
import type { Html, HtmlBuilder } from "foldkit/html"
import type { Resources } from "../platform/resources"
import type { AppRoute } from "../route"
import type { BreadcrumbEntry } from "../shell"
import type { PageSourceRef } from "../shell/source-link"
import type {
	PageContext,
	PageHost,
	PageMessageBase,
	PageOutMessage,
	PageSlotBase,
	PageStep,
	PageViewInputs,
} from "./contract"
import * as Settings from "./settings"
import * as Integrations from "./integrations"
import * as SourcesNew from "./sources/new"
import * as SourceDetail from "./sources/detail"
import * as AlertEditor from "./alerts/editor"
import * as ReplayDetail from "./replays/detail"
import * as ReplaysList from "./replays/list"
import * as ServicesList from "./services/list"
import * as McpPage from "./settings/mcp-page"
import * as TraceDetail from "./traces/detail"
import * as TracesList from "./traces/list"

class InvalidPageCatalog extends Schema.TaggedError<InvalidPageCatalog>()("@maple/web/InvalidPageCatalog", {
	message: Schema.String,
	identifier: Schema.String,
}) {}

/**
 * Every page, registered once. Adding a page: import its module and append `X.page` below;
 * that is the only shared file a page touches. Shell routes without a page render the placeholder.
 */
const eagerPages = [
	Settings.page,
	Integrations.page,
	SourcesNew.page,
	SourceDetail.page,
	ServicesList.page,
	TracesList.page,
	TraceDetail.page,
	AlertEditor.page,
	McpPage.page,
	ReplaysList.page,
	ReplayDetail.page,
]

/** Public routes a page renders bare, outside the shell (`/share/$token`). */
const BARE_PAGE_ROUTES: ReadonlyArray<AppRoute["_tag"]> = ["Share"]

export const isBarePageRoute = (route: AppRoute): boolean => BARE_PAGE_ROUTES.includes(route._tag)

const schemaPages = [...eagerPages, ...contracts]

export const PageSlot = Schema.Union(Array.map(schemaPages, (page) => page.Slot))
export type PageSlot = typeof PageSlot.Type

export const PageMessage = Schema.Union(Array.map(schemaPages, (page) => page.Wrapped))
export type PageMessage = typeof PageMessage.Type

/** The page slot after a transition, with the Commands and OutMessage that came with it. */
export interface PageTransition {
	readonly slot: PageSlot | null
	readonly commands: ReadonlyArray<Command.Command<PageMessage, never, Resources>>
	readonly outMessage: Option.Option<PageOutMessage>
}

export const pageIdentity = (slot: PageSlotBase | null): string =>
	slot === null ? "" : `${slot._tag}:${slot.key}:${slot.orgId}:${slot.instance}`

export const pageSlotId = (slot: PageSlotBase): string => `page:${pageIdentity(slot)}`

export const createPageRegistry = (options: { readonly buildId: string }) => {
	const lazyPages = createCatalog(options)
	const pages = [...eagerPages, ...lazyPages]
	const owners = new Map<string, string>()
	const identifiers = new Set<string>()
	for (const page of pages) {
		if (identifiers.has(page.id))
			throw new InvalidPageCatalog({
				identifier: page.id,
				message: `Duplicate page identifier ${page.id}`,
			})
		identifiers.add(page.id)
	}
	for (const page of pages)
		for (const route of page.routes) {
			if (owners.has(route))
				throw new InvalidPageCatalog({
					identifier: route,
					message: `Duplicate page route ${route}: ${owners.get(route)} and ${page.id}`,
				})
			owners.set(route, page.id)
		}
	const unchanged = (slot: PageSlot | null): PageTransition => ({
		slot,
		commands: [],
		outMessage: Option.none(),
	})

	const toTransition = (step: Option.Option<PageStep<PageSlot, PageMessage>>, fallback: PageSlot | null) =>
		Option.match(step, { onNone: () => unchanged(fallback), onSome: (found): PageTransition => found })

	const pageById = (id: string) => Array.findFirst(pages, (page) => page.id === id)

	/**
	 * Route entry: keep the instance when its key and org are unchanged (it gets `routeChanged`),
	 * otherwise revive a parked instance of the route's page or build it, as instance `nextInstance`.
	 */
	const enterRoute = (
		current: PageSlot | null,
		route: AppRoute,
		context: PageContext,
		nextInstance: number,
		parked: ReadonlyArray<PageSlot> = [],
	): PageTransition =>
		Option.match(
			Array.findFirst(pages, (page) => Option.isSome(page.keyOf(route))),
			{
				onNone: () => unchanged(null),
				onSome: (page) => {
					const isSameInstance =
						current !== null &&
						current._tag === page.id &&
						current.orgId === context.orgId &&
						Option.contains(page.keyOf(route), current.key)
					if (isSameInstance)
						return toTransition(page.routeChanged(current, route, context), current)
					const revived = Option.flatMap(
						Array.findFirst(
							parked,
							(slot) => slot._tag === page.id && Option.contains(page.keyOf(route), slot.key),
						),
						(slot): Option.Option<PageStep<PageSlot, PageMessage>> =>
							page.revive(slot, route, context, nextInstance),
					)
					return Option.isSome(revived)
						? toTransition(revived, null)
						: toTransition(page.init(route, context, nextInstance), null)
				},
			},
		)

	const ASYNC_DATA_TAGS: ReadonlyArray<string> = [
		"Idle",
		"Loading",
		"Refreshing",
		"Failure",
		"Stale",
		"Success",
	]

	/** Some `AsyncData` in the Model is in flight; its answer would be dropped while parked. */
	const hasLoadInFlight = (value: unknown): boolean => {
		if (Array.isArray(value)) return Array.some(value, hasLoadInFlight)
		if (!Predicate.isReadonlyObject(value)) return false
		const tag = value["_tag"]
		// An `AsyncData`'s own data holds no requests: rows are not walked.
		if (Predicate.isString(tag) && ASYNC_DATA_TAGS.includes(tag))
			return tag === "Loading" || tag === "Refreshing"
		return Array.some(Rec.values(value), hasLoadInFlight)
	}

	/** How many left pages are kept to revive; each holds its last data. */
	const PARKED_PAGES_MAX = 4

	/** The parked pages after leaving `left` for `entered`: newest first, the entered one taken out. */
	const parkPages = (
		parked: ReadonlyArray<PageSlot>,
		left: PageSlot | null,
		entered: PageSlot | null,
	): ReadonlyArray<PageSlot> => {
		const isLeft =
			left !== null &&
			pageIdentity(left) !== pageIdentity(entered) &&
			Array.some(pages, (page) => page.id === left._tag && page.isRevivable) &&
			!hasLoadInFlight(left.model)
		const sameSlot = (a: PageSlotBase, b: PageSlotBase) => a._tag === b._tag && a.key === b.key
		const next = Array.filter(
			[...(isLeft ? [left] : []), ...parked],
			(slot) => entered === null || (slot.orgId === entered.orgId && !sameSlot(slot, entered)),
		)
			.filter((slot, index, all) => all.findIndex((other) => sameSlot(other, slot)) === index)
			.slice(0, PARKED_PAGES_MAX)
		// Nothing parked or taken out: the same array, so the root Model can stay the same reference.
		return next.length === parked.length && Array.every(next, (slot, index) => slot === parked[index])
			? parked
			: next
	}

	/** Link intent (`page/preload.ts`): the route's page's preload Commands, or none. */
	const preloadRoute = (
		route: AppRoute,
		context: PageContext,
		nowMs: number,
	): ReadonlyArray<Command.Command<PageMessage, never, Resources>> =>
		Option.getOrElse(
			Array.findFirst(pages, (page) => Option.isSome(page.keyOf(route))).pipe(
				Option.flatMap(
					(page): Option.Option<ReadonlyArray<Command.Command<PageMessage, never, Resources>>> =>
						page.preload(route, context, nowMs),
				),
			),
			() => [],
		)

	/** A page instance's identity: a new one starts with nothing held. */

	const updatePage = (
		current: PageSlot | null,
		message: PageMessageBase,
		context: PageContext,
	): PageTransition =>
		current === null
			? unchanged(current)
			: Option.match(pageById(message._tag), {
					onNone: () => unchanged(current),
					onSome: (page) => toTransition(page.update(current, message, context), current),
				})

	const toHeld = (step: Option.Option<PageStep<PageSlot, PageMessage>>): Option.Option<PageTransition> =>
		step

	/**
	 * `useBlocker`: a navigation to `route` that would drop the open instance, held by a page that
	 * blocks it; `None` lets it through (no page, a page that allows it, or the same instance).
	 */
	const blockNavigation = (
		current: PageSlot | null,
		route: AppRoute,
		url: string,
		context: PageContext,
	): Option.Option<PageTransition> => {
		if (current === null) return Option.none()
		const isSameInstance = Array.some(
			pages,
			(page) => page.id === current._tag && Option.contains(page.keyOf(route), current.key),
		)
		if (isSameInstance) return Option.none()
		return Option.flatMap(pageById(current._tag), (page) =>
			toHeld(page.blockedNavigation(current, url, context)),
		)
	}

	const changeContext = (current: PageSlot | null, context: PageContext): PageTransition =>
		current === null
			? unchanged(current)
			: Option.match(pageById(current._tag), {
					onNone: () => unchanged(current),
					onSome: (page) => toTransition(page.contextChanged(current, context), current),
				})

	const settleInfraSurfaces = (current: PageSlot | null, context: PageContext): PageTransition =>
		current === null
			? unchanged(current)
			: Option.match(pageById(current._tag), {
					onNone: () => unchanged(current),
					onSome: (page) => toTransition(page.infraSurfacesSettled(current, context), current),
				})

	const pageBreadcrumbs = (slot: PageSlotBase): ReadonlyArray<BreadcrumbEntry> =>
		Option.match(pageById(slot._tag), { onNone: () => [], onSome: (page) => page.breadcrumbs(slot) })

	/** The source the page's data comes from, for the top bar's link. */
	const pageSource = (slot: PageSlotBase): PageSourceRef | null =>
		Option.match(pageById(slot._tag), { onNone: () => null, onSome: (page) => page.source(slot) })

	/** The page links to its source, so entering it reads the org's sources. */
	const pageHasSource = (slot: PageSlotBase): boolean =>
		Option.match(pageById(slot._tag), { onNone: () => false, onSome: (page) => page.hasSource })

	const pageSubscriptions = Subscription.aggregate<PageHost, PageMessage, Resources>()(
		...Array.map(pages, (page) => page.subscriptions),
	)

	/** The page's view boundary: a new instance (another org on the same route, too) mounts afresh. */

	/** Embeds the active page under `pageSlotId`. */
	const viewPage = <ParentMessage>(
		h: HtmlBuilder<ParentMessage>,
		slot: PageSlotBase,
		inputs: PageViewInputs,
		toParentMessage: (message: PageMessage) => ParentMessage,
	): Html =>
		Option.match(pageById(slot._tag), {
			onNone: () => h.empty,
			onSome: (page) =>
				h.submodel({
					slotId: pageSlotId(slot),
					model: slot,
					view: page.hostView,
					viewInputs: inputs,
					toParentMessage,
				}),
		})

	/** The active page's top-bar actions (`DashboardPage topbarActions`), or nothing. */
	const viewPageTopbarActions = <ParentMessage>(
		h: HtmlBuilder<ParentMessage>,
		slot: PageSlotBase,
		inputs: PageViewInputs,
		toParentMessage: (message: PageMessage) => ParentMessage,
	): Html =>
		Option.match(pageById(slot._tag), {
			onNone: () => h.empty,
			onSome: (page) =>
				h.submodel({
					slotId: `page-topbar:${pageIdentity(slot)}`,
					model: slot,
					view: page.hostTopbarActions,
					viewInputs: inputs,
					toParentMessage,
				}),
		})

	const emptyDynamic: Subscription.Subscriptions<PageHost, PageMessage, Resources> = {}
	const dynamicPageSubscriptions = (
		host: PageHost,
	): Subscription.Subscriptions<PageHost, PageMessage, Resources> => {
		const page = lazyPages.find((page) => page.id === host.page?._tag)
		return page ? page.dynamicSubscriptions(host) : emptyDynamic
	}
	const preparePages = (slots: ReadonlyArray<PageSlot>) =>
		Effect.forEach(
			slots,
			(slot) => {
				const page = lazyPages.find((page) => page.id === slot._tag)
				return page ? page.prepare(slot) : Effect.void
			},
			{ discard: true },
		)
	const resumePage = (slot: PageSlot | null): PageTransition["commands"] =>
		slot === null ? [] : (lazyPages.find((page) => page.id === slot._tag)?.resume(slot) ?? [])
	const isCompatible = (slots: ReadonlyArray<PageSlot>) =>
		slots.every((slot) => lazyPages.every((page) => page.isCompatible(slot)))
	const prefetchAll = () =>
		Effect.forEach(lazyPages, (page) => page.prefetch(), { discard: true, concurrency: "unbounded" })
	return {
		pages,
		isCompatible,
		prefetchAll,
		dynamicPageSubscriptions,
		preparePages,
		resumePage,
		enterRoute,
		parkPages,
		preloadRoute,
		updatePage,
		blockNavigation,
		changeContext,
		settleInfraSurfaces,
		pageBreadcrumbs,
		pageSource,
		pageHasSource,
		pageSubscriptions,
		viewPage,
		viewPageTopbarActions,
	}
}
export type PageRegistry = ReturnType<typeof createPageRegistry>
