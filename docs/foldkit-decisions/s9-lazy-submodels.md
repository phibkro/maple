# S9: Complete lazy Submodels

Status: implemented locally. The benchmark report records measured results and publication status.

## Decision

A complete Submodel contract separates eager schemas from lazy execution. The parent keeps synchronous pure updates and typed Messages. Commands prepare code before a matching completion admits child execution.

Foldkit now supplies `Submodel.contract`, `Submodel.implement`, `Submodel.lazy`, and `Submodel.eager`. The runtime supplies `dynamicSubscriptions` and an initial `prepareModel` barrier. These APIs are additive.

The Vite generator discovers explicit `*.contract.ts` files and generates typed literal imports. The application creates its own catalog through `createProgram({ buildId })`. No mutable page registry exists at module scope.

```text
route contract (eager)
  schemas + route ownership + stable key
       ↓ generated catalog
application-owned host
  Loading → preparation Command → matching completion → Ready
       ↓
implementation (lazy)
  init + update + view + Commands + Subscriptions + revive
```

## Maple integration

The generated catalog contains 69 complete lazy pages. Eleven pages remain eager. The root registry combines both kinds without changing route ownership or existing data preloads.

```ts
// dashboards/list/page.contract.ts
export const contract = defineLazyPageContract(
	"DashboardsList",
	{ Model, Message },
	{
		routes: ["Dashboards"],
		revivable: true,
	},
)

// dashboards/list/index.ts
export const page = implementPage(contract, {
	init,
	update,
	routeChanged,
	revive,
	view,
	subscriptions,
})
```

The contract supplies schemas and routing metadata once. `bun run submodels:generate` generates imports of each adjacent `index.ts`. The production build refuses stale generated output.

| Eager pages                                                      | Constraint                                                                     |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| ServicesList, TracesList, TraceDetail, ReplaysList, ReplayDetail | Existing data preloads need an explicit prepared-data protocol.                |
| AlertEditor                                                      | Its route key depends on an implementation-local encoder.                      |
| Integrations, SourcesNew, SourceDetail                           | The source wizard embeds Integrations, and the shell embeds the source wizard. |
| Settings, McpPage                                                | The standalone MCP page borrows Settings Commands and subscriptions.           |

These pages retain their existing behavior. Converting them requires another shared Submodel boundary or a data-preload protocol.

The expanded build identified shared helpers inside route implementations. The refactor moves metric shells, metric grids, chart legends, marker overlays, dashboard decoding, and GCP value styling to shared modules. Schema imports use schema modules directly instead of executable barrels.

## State and code

The host Model contains `Loading`, `Failed`, or `Ready`. Every state contains the input, build identity, instance, and attempt. `Ready` also contains the serializable child Model.

A preparation Command owns the import. Entry always returns this Command, including after prefetch. A completion can initialize the child only for the matching build, instance, and attempt.

Child Messages retain the instance and build identity. Old Command results cannot affect a new page instance. A parked page retains data and receives a fresh instance during revive.

The module cache belongs to one application and one build. Code functions stay outside the Model. Before restoration or fresh-host replay, the application prepares all active and parked modules.

A cold synchronous read of `Ready` fails explicitly. The host never renders an empty substitute because code is unavailable. This establishes a preparation requirement for replay instead of a cache-dependent update branch.

Maple filters restored Models against the current build identity. Development edits rotate that identity and trigger a full reload. Models from an older identity fail decoding and initialize afresh.

## Subscriptions and cleanup

The runtime selects dynamic subscriptions from the current Model. Each named entry retains its own dependencies and fiber. A dependency change restarts only that entry.

An entry removal completes cleanup before its replacement starts. The latest dependency reader updates even when a keep-alive equivalence prevents restart. Runtime shutdown interrupts all selected entries.

Maple lifts only the admitted active page subscriptions. Parked pages retain no active page subscriptions. Existing DOM Mount cleanup remains under the normal Foldkit differ.

## Failure and retry

The loader coalesces concurrent requests and clears a rejected pending Promise. A synchronous loader exception also clears that pending request.

Chromium can retain a failed native import after a network error. The production browser test exposed this behavior after a real chunk abort. Retrying the same import URL did not recover.

Maple therefore handles Retry with a typed `ReloadLazyPage` Command. The new document clears failed import records and reads the current entry document. The failure UI states that Retry reloads the page.

This recovery loses in-memory parked pages and other transient state. The failed destination contains no admitted editable child. Persisted preferences and the session token survive through their existing storage.

The generic Foldkit host still supports loader-level retries and attempt matching. Browser loaders must supply an appropriate recovery policy. An invalid deployed module requires a corrected deployment.

## Automatic boundaries and diagnostics

Discovery, typed imports, catalog generation, build identity, and a chunk manifest are automatic after the contract boundary exists. The generator does not infer arbitrary route relationships from application code.

The compiler diagnoses contract-to-execution imports, cross-route implementation imports, and executable route modules in startup chunks. It reports concrete import paths. The registry rejects duplicate route ownership.

Cycles within one implementation are legal. Shared executable modules belong outside route implementation directories. Cross-route cycles require an explicit refactor or eager retention.

The compiler recognizes the configured implementation file and conventional execution filenames. Arbitrary filenames can contain execution too. Bundle inspection supplements these diagnostics.

## Schemas and server rendering

Model and Message schemas remain eager. This preserves synchronous root decoding, typed toast actions, persistence, and Scene composition. Schema dependencies therefore limit the startup reduction.

Lazy schemas require an asynchronous decode protocol: decode an envelope, prepare its module, then decode its child value. Replacing the child schema with `Unknown` does not preserve validation.

The primitive supports an explicit preparation barrier before synchronous rendering. Separate server and client builds still need coordinated identities and asset manifests. The plugin does not automate that coordination.

Maple is a client-rendered application. These changes do not claim verified SSR or hydration integration. A complete SSR integration remains separate work.

## Audit of PR #1

The audit used commit `7526d7ae0`, based on Maple `084ee139d`.

- Nine handwritten view imports covered nine of 80 registered pages. Update logic, Commands, subscriptions, and schemas remained eager.
- The loader coalesced loads and retried rejected Promises. A synchronous loader exception escaped before Promise handling.
- The root retained Failed permanently. The UI requested a manual reload. The retry test covered a cache helper rather than application recovery.
- A view read mutable code storage and rendered empty before preparation. No fresh-host restoration barrier enforced code availability.
- The race test covered import caches rather than real navigation, instances, parking, or cleanup.
- The manifest walk supplied a useful static-closure check. Its per-view byte count excluded transitive lazy dependencies.
- HMR, SSR, hydration, and browser chunk recovery lacked execution evidence.

The implementation retains the useful static-closure approach. It replaces the view-only cache interface with complete Submodel admission and application-owned catalogs.

## Alternatives

A runtime-interpreted `Update.Plan` can make code resolution an explicit execution dependency. That design changes immediate `Update.Return`, rendering, subscriptions, and test drivers together. The additive host requires fewer runtime changes.

Compiler extraction from arbitrary page declarations can reduce explicit metadata. It also needs restrictions on free variables, route keys, schemas, and shared execution. Explicit contracts expose those boundaries directly.

The resulting API demonstrates that Submodel refactoring enables automatic splitting. It also exposes the next API questions: prepared data, asynchronous schema decoding, shared embedded children, and coordinated SSR preparation.

## Reproduction and evidence

See `apps/web/perf` for the bundle analyzer, browser fixtures, and browser harness. See the benchmark report for versions, commands, raw samples, graphs, and limitations.

The baseline production build and typecheck passed. Its full web suite had two timeouts under contention. Both files passed alone with one worker. The report retains that distinction.
