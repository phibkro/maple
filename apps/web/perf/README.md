# Route-splitting measurements

These scripts compare production builds of Maple. They measure real emitted files and a Chromium browser with deterministic API fixtures. They do not require a running Maple backend.

The recorded comparison and raw results are in [the report](../../../docs/foldkit-decisions/route-splitting/report.md). The [design decision](../../../docs/foldkit-decisions/s9-lazy-submodels.md) describes the API, eager exceptions, lifecycle, and SSR limits.

## Requirements

- Node 24.22.1 and Bun 1.4.4.
- Dependencies installed with `bun install --frozen-lockfile`.
- `bun run --cwd packages/effect-sdk build` completed.
- Chromium 155.0.8059.79 at `/usr/bin/chromium`, or `CHROMIUM_PATH` set explicitly.
- Playwright 1.64.1 in the Bun store. The harness discovers it from the installed workspace.
- Python with matplotlib 3.10.8 to render the report.
- A built Foldkit checkout at `1ef1c4f7aef25af7e24a09b27048238c2a27fa5d` for the optimized variant. Its base is upstream v0.170 (`a471adb2`), matching Maple's installed package versions.

Run this procedure in a dedicated clean checkout. Switching revisions requires a clean working tree. Keep measurements outside the checkout. Do not run builds, tests, compression, or other CPU-intensive jobs during browser measurements.

## Preserve the common harness

From the integration branch at the Maple repository root:

```bash
export BENCH_MAPLE_ROOT="$PWD"
export ROUTE_RESULTS=/tmp/maple-route-results
export ROUTE_HARNESS=/tmp/maple-route-harness
mkdir -p "$ROUTE_RESULTS" "$ROUTE_HARNESS"
cp -R apps/web/perf "$ROUTE_HARNESS/perf"
ln -s "$PWD/node_modules" "$ROUTE_HARNESS/node_modules"
```

Keep this copy unchanged for both variants. `BENCH_MAPLE_ROOT` lets the browser script find the same dependency store after the harness is copied outside the repository. Build scripts run in the current working directory.

The report's `raw/measurement-*.mjs.txt` files preserve the exact executed browser harness, fixtures, and JSON helper. Their SHA-256 hashes are in `raw/environment.json`. Copy them to their corresponding `.mjs` filenames in an alternate external harness directory for byte-identical historical reproduction. Use the maintained harness for the added untimed filter check.

## Baseline

Restore published Foldkit packages before switching away from the integration branch:

```bash
node scripts/link-foldkit.mjs --unlink
git switch --detach 084ee139d0ad63e563820f547016fccbab4c3f43
node "$ROUTE_HARNESS/perf/profile-build.mjs" "$ROUTE_RESULTS/baseline-builds" 3
cp -R apps/web/dist "$ROUTE_RESULTS/baseline-dist"
node "$ROUTE_HARNESS/perf/benchmark-browser.mjs" \
  "$ROUTE_RESULTS/baseline-dist" "$ROUTE_RESULTS/baseline-browser.json"
```

The three production builds use the unchanged lockfile and published Foldkit 0.170.0. The last build supplies the browser artifact. Preserve its `.vite/manifest.json`.

## Lazy Submodels

Return to the integration branch. Build the two Foldkit packages in the adjacent checkout first, then overlay their built files into Maple:

```bash
git switch --detach 484e997690ab3282819bdddc17786c4137257cef
node scripts/link-foldkit.mjs ../foldkit
bun run submodels:check
node "$ROUTE_HARNESS/perf/profile-build.mjs" "$ROUTE_RESULTS/after-builds" 3
cp -R apps/web/dist "$ROUTE_RESULTS/after-dist"
node "$ROUTE_HARNESS/perf/benchmark-browser.mjs" \
  "$ROUTE_RESULTS/after-dist" "$ROUTE_RESULTS/after-browser.json" --verify
```

The overlay copies built package output and retains Maple's Effect dependency resolution. It preserves published packages for `--unlink`. It does not change package declarations or the lockfile. Installing dependencies again can replace the overlay; reapply it before measuring.

The optimized browser run also checks a delayed implementation across A → B → A and aborts a real chunk request. Retry must recover by reloading the document. This is separate from the timed samples.

Verify native document identity on both artifacts:

```bash
node "$ROUTE_HARNESS/perf/benchmark-browser.mjs" \
  "$ROUTE_RESULTS/baseline-dist" "$ROUTE_RESULTS/baseline-navigation.json" \
  --verify-only --verify-document --smoke
node "$ROUTE_HARNESS/perf/benchmark-browser.mjs" \
  "$ROUTE_RESULTS/after-dist" "$ROUTE_RESULTS/after-navigation.json" \
  --verify-only --verify-document --smoke
```

This check compares CDP frame loader identities across route clicks, Back, and Forward. It supplements the timed harness's native `performance.timeOrigin` guard. Add `--screenshots` to capture all three loaded routes.

Verify completed dense filtering separately from the recorded automation-duration metric:

```bash
node "$ROUTE_HARNESS/perf/benchmark-browser.mjs" \
  "$ROUTE_RESULTS/baseline-dist" "$ROUTE_RESULTS/baseline-filter-verification.json" \
  --verify-only --verify-filter --smoke
node "$ROUTE_HARNESS/perf/benchmark-browser.mjs" \
  "$ROUTE_RESULTS/after-dist" "$ROUTE_RESULTS/after-filter-verification.json" \
  --verify-only --verify-filter --smoke
```

This check waits for a nonmatching row to disappear, then reappear after reset.

## Bundle analysis and report

Run compression after browser measurements. The optional cache is keyed by file content and compression settings.

```bash
export BUNDLE_COMPRESSION_CACHE="$ROUTE_RESULTS/compression-cache"
node "$ROUTE_HARNESS/perf/analyze-bundle.mjs" \
  "$ROUTE_RESULTS/baseline-dist" "$ROUTE_RESULTS/baseline-bundle.json"
node "$ROUTE_HARNESS/perf/analyze-bundle.mjs" \
  "$ROUTE_RESULTS/after-dist" "$ROUTE_RESULTS/after-bundle.json"
cp "$ROUTE_RESULTS/baseline-builds/build-times.json" "$ROUTE_RESULTS/baseline-build-times.json"
cp "$ROUTE_RESULTS/after-builds/build-times.json" "$ROUTE_RESULTS/after-build-times.json"
MPLCONFIGDIR=/tmp/maple-benchmark-mpl python3 "$ROUTE_HARNESS/perf/report.py" \
  "$ROUTE_RESULTS" "$ROUTE_RESULTS/report"
```

The analyzer follows static imports from the scripts in the emitted document. It counts each JavaScript file once, compresses each file independently with gzip 9 and Brotli 11, and includes workers in total output. A route's extra payload follows its transitive imports and subtracts the startup closure. The generated `foldkit-submodels.json` maps contracts to implementation chunks.

`node --test "$ROUTE_HARNESS/perf/analyze-bundle.test.mjs"` checks transitive traversal and missing dependency handling. Vite integration tests in Foldkit independently reject route implementation leakage into startup.

After all timed runs, inspect the optimized dependency graph with a supplemental build:

```bash
node "$ROUTE_HARNESS/perf/inspect-build.mjs" "$ROUTE_RESULTS/inspection"
```

This keeps measured artifacts intact and writes `module-graph.json` plus a separate build. The graph records emitted modules, physical package instances, and bundler-reported rendered lengths. Those lengths precede output minification and compression; use the bundle analyzer for payload sizes. Compare the supplemental build's JavaScript hashes with the measured optimized artifact before applying its package findings to that artifact.

## Browser workload

The default run uses three fresh contexts for each route:

| Kind             | Route                                     | Loaded content                                         |
| ---------------- | ----------------------------------------- | ------------------------------------------------------ |
| Lightweight      | `/dashboards/templates`                   | Empty template inventory with a working search control |
| Data-intensive   | `/dashboards`                             | 500 dashboard rows and search                          |
| Dependency-heavy | `/agent-sessions/bench-session?view=flow` | 200 AI spans and Flow selection                        |

The viewport is 1440×1000, locale en-US, and timezone UTC. A Date-only wrapper fixes the date at 2026-11-04T12:00:10Z. Timers, `performance`, and performance observers remain native. CDP applies 4× CPU throttling and network conditions of 40ms latency, 1,500,000 bytes/s download, and 750,000 bytes/s upload. Static assets use gzip 9. All API responses come from `fixtures.mjs`. The recorded builds retain default production telemetry/replay settings; their ingestion requests are intercepted, while recorder CPU work remains enabled.

Readiness requires route content and two animation frames. LCP is sampled through readiness plus 100ms. The harness records traced parse/compilation time across threads, CDP script time, retained heap after forced GC, and automated control-action duration. Each context then visits a new route, revisits its cached route, and navigates to a third route after focus prefetch. Prefetch gets at least 1,200ms lead time. Request routing disables HTTP cache; cached visits measure module reuse.

The timed dense action fills and clears search, but its row-presence waits do not prove that filtering finished before reset. Treat that duration as automation time, not filter-render latency. The separate `--verify-filter` check proves functional filtering with nonmatching-row assertions. Templates and span selection wait for changed text or selection state during their timed actions. The raw measurement harness snapshot predates the added untimed filter check; its timed path is unchanged.

`--smoke` runs one sample per route without CPU or network throttling. `--verify-only` skips timed samples. `BENCH_SAMPLES` changes the sample count, but the report deliberately requires three samples for this comparison.

The report shows medians and observed minimum/maximum values. These samples do not establish statistical significance or tail latency. API fixtures omit real backend latency. Tracing adds overhead. Raw browser JSON retains requests, resource timings, failures, trace summaries, heap samples, and prefetch lead times. Full trace event streams are not retained.

An earlier pilot used Playwright's fixed-clock wrapper, which suppressed resource-timing entries. That pilot is excluded. The final harness asserts that native resource timings contain loaded JavaScript, and both variants use the Date-only wrapper.
