"""Render the recorded route-splitting comparison. Requires matplotlib 3.10.8."""
import json
import statistics as stats
import sys
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

raw = Path(sys.argv[1])
out = Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
read = lambda name: json.loads((raw / name).read_text())
bundles = [read("baseline-bundle.json"), read("after-bundle.json")]
browsers = [read("baseline-browser.json"), read("after-browser.json")]
builds = [read("baseline-build-times.json"), read("after-build-times.json")]
labels = ["Baseline", "Lazy Submodels"]
colors = ["#667085", "#2563eb"]
routes = ["light", "dense", "heavy"]
names = {"light": "Templates", "dense": "500 dashboards", "heavy": "200 agent spans"}
for result in browsers:
    assert len(result["runs"]) == 9, "Expected three samples of all three routes"
    for route in routes:
        assert len([run for run in result["runs"] if run["route"] == route]) == 3
    assert result["conditions"]["fixtureDashboards"] == 500
    assert result["conditions"]["fixtureSpans"] == 200
assert browsers[0]["conditions"] == browsers[1]["conditions"]
assert browsers[0]["browser"] == browsers[1]["browser"]

def distribution(values):
    assert len(values) == 3 and all(value is not None for value in values)
    return stats.median(values), min(values), max(values)

def cell(values, divisor=1, decimals=1):
    middle, low, high = distribution([value / divisor for value in values])
    return f"{middle:.{decimals}f} [{low:.{decimals}f}, {high:.{decimals}f}]"

def cold(result, route, field):
    return [run["cold"][field] for run in result["runs"] if run["route"] == route]

def compile_time(result, route):
    return [run["cold"]["trace"]["compileAndParseMs"] for run in result["runs"] if run["route"] == route]

def navigation(result, route, mode):
    if mode == "cached":
        return [run["cachedVisitMs"] for run in result["runs"] if run["route"] == route]
    field = "firstVisit" if mode == "first" else "prefetchedVisit"
    return [run[field]["ms"] for run in result["runs"] if run[field]["route"] == route]

def bars(axis, groups, series, title, unit):
    for variant in range(2):
        samples = [distribution(values) for values in series[variant]]
        centers = [middle for middle, low, high in samples]
        errors = [[middle-low for middle,low,high in samples], [high-middle for middle,low,high in samples]]
        positions = [index + (variant - 0.5) * 0.36 for index in range(len(groups))]
        axis.bar(positions, centers, width=0.34, color=colors[variant], label=labels[variant], yerr=errors, capsize=3)
    axis.set_xticks(range(len(groups)), groups)
    axis.set_title(title, loc="left", fontweight="bold")
    axis.set_ylabel(unit)
    axis.grid(axis="y", alpha=0.18)
    axis.set_axisbelow(True)

plt.rcParams.update({"font.family": "DejaVu Sans", "font.size": 10, "axes.spines.top": False, "axes.spines.right": False})
fig, axes = plt.subplots(2, 3, figsize=(14, 8), constrained_layout=True)
metrics = [("readyMs", "Loaded-route readiness", "ms", 1), ("lcp", "LCP through readiness + 100ms", "ms", 1),
           (None, "Traced parse / compilation", "thread-ms", 1), ("scriptDurationMs", "Main-thread scripting", "ms", 1),
           ("retainedHeapUsedBytes", "Retained JS heap after GC", "MiB", 1024**2), ("interaction", "Automated control action", "ms", 1)]
for axis, (field, title, unit, divisor) in zip(axes.flat, metrics):
    values = []
    for browser in browsers:
        variant = []
        for route in routes:
            if field is None: samples = compile_time(browser, route)
            elif field == "interaction": samples = [run["interactionLatencyMs"] for run in browser["runs"] if run["route"] == route]
            else: samples = cold(browser, route, field)
            variant.append([value/divisor for value in samples])
        values.append(variant)
    bars(axis, [names[route] for route in routes], values, title, unit)
axes.flat[0].legend()
fig.suptitle("Production browser comparison: median and observed range, n=3 per route", fontsize=14)
fig.savefig(out / "browser.svg")
fig.savefig(out / "browser.png", dpi=150)
plt.close(fig)

fig, axes = plt.subplots(1, 3, figsize=(14, 4), constrained_layout=True)
for axis, mode in zip(axes, ["first", "cached", "prefetched"]):
    values = [[navigation(browser, route, mode) for route in routes] for browser in browsers]
    bars(axis, [names[route] for route in routes], values, f"{mode.title()} client navigation", "ms")
axes[0].legend()
fig.savefig(out / "navigation.svg")
fig.savefig(out / "navigation.png", dpi=150)
plt.close(fig)

fig, axes = plt.subplots(1, 3, figsize=(13, 4), constrained_layout=True)
for axis, field, title in [(axes[0], "initial", "Startup JS"), (axes[1], "total", "All emitted JS")]:
    for variant, bundle in enumerate(bundles):
        values = [bundle[field][codec] / 1024**2 for codec in ["gzip", "brotli"]]
        axis.bar([index+(variant-0.5)*0.36 for index in range(2)], values, width=.34, color=colors[variant], label=labels[variant])
    axis.set_xticks([0, 1], ["gzip 9", "Brotli 11"])
    axis.set_title(title, loc="left", fontweight="bold")
    axis.set_ylabel("MiB")
    axis.grid(axis="y", alpha=.18)
    axis.set_axisbelow(True)
bars(axes[2], ["Production build"], [[[sample["milliseconds"]/1000 for sample in variant]] for variant in builds], "Build wall time", "seconds")
axes[0].legend()
fig.savefig(out / "payload-and-build.svg")
fig.savefig(out / "payload-and-build.png", dpi=150)
plt.close(fig)

lines = ["# Automatic route splitting: measured comparison", "", "This comparison uses 69 complete lazy pages and 11 retained eager pages. The generated catalog replaces per-page handwritten imports.", "",
         "Framework source: `1ef1c4f7aef25af7e24a09b27048238c2a27fa5d`, based on upstream Foldkit `a471adb2` (v0.170). Maple baseline: `084ee139d0ad63e563820f547016fccbab4c3f43`.", "",
         "Measured Maple application: `484e997690ab3282819bdddc17786c4137257cef`. The later evidence commit does not change application code.", "",
         f"Initial JavaScript falls {100*(1-bundles[1]['initial']['gzip']/bundles[0]['initial']['gzip']):.1f}% gzip and {100*(1-bundles[1]['initial']['brotli']/bundles[0]['initial']['brotli']):.1f}% Brotli. Total emitted JavaScript grows {100*(bundles[1]['total']['gzip']/bundles[0]['total']['gzip']-1):.1f}% gzip. The heavy route improves, while lightweight readiness and cached navigation regress in these samples.", "",
         "## JavaScript and build results", "", "Compression is independent per file. Startup follows the emitted document's static import closure. Total includes JavaScript workers.", "",
         "| Metric | Baseline | Lazy Submodels | Change |", "| --- | ---: | ---: | ---: |"]
for field, metric in [("initial", "raw"), ("initial", "gzip"), ("initial", "brotli"), ("initial", "chunks"), ("total", "raw"), ("total", "gzip"), ("total", "brotli"), ("total", "chunks")]:
    before, after = [bundle[field][metric] for bundle in bundles]
    unit = "files" if metric == "chunks" else "bytes"
    lines.append(f"| {field.title()} JS {metric} ({unit}) | {before:,} | {after:,} | {(after/before-1)*100:+.1f}% |")
lines += [f"| Build seconds, median [min, max] | {cell([sample['milliseconds'] for sample in builds[0]], 1000)} | {cell([sample['milliseconds'] for sample in builds[1]], 1000)} | n=3 |", "", "![Payload and build time](payload-and-build.svg)", "",
          "## Browser results", "", "Each cell is the median [minimum, maximum] of three runs. Samples use fresh browser contexts. Cached navigation retains the module cache.", "",
          "| Route | Metric | Baseline | Lazy Submodels |", "| --- | --- | ---: | ---: |"]
for route in routes:
    for field, label, divisor in [("readyMs", "Loaded-route readiness (ms)", 1), ("lcp", "LCP (ms)", 1), ("scriptDurationMs", "Main-thread script time (ms)", 1), ("retainedHeapUsedBytes", "Retained heap (MiB)", 1024**2)]:
        lines.append(f"| {names[route]} | {label} | {cell(cold(browsers[0],route,field),divisor)} | {cell(cold(browsers[1],route,field),divisor)} |")
    lines.append(f"| {names[route]} | Traced parse / compilation (thread-ms) | {cell(compile_time(browsers[0],route))} | {cell(compile_time(browsers[1],route))} |")
    interactions = [[run['interactionLatencyMs'] for run in browser['runs'] if run['route'] == route] for browser in browsers]
    lines.append(f"| {names[route]} | Automated control action (ms) | {cell(interactions[0])} | {cell(interactions[1])} |")
lines += ["", "![Cold loads and memory](browser.svg)", "", "## Navigation results", "",
          "Navigation uses the real document click handler. The harness refuses a document reload during client navigation.", "",
          "| Destination | Visit | Baseline (ms) | Lazy Submodels (ms) |", "| --- | --- | ---: | ---: |"]
for route in routes:
    for mode in ["first", "cached", "prefetched"]:
        lines.append(f"| {names[route]} | {mode} | {cell(navigation(browsers[0],route,mode))} | {cell(navigation(browsers[1],route,mode))} |")
lines += ["", "![Client navigation](navigation.svg)", "", "## Additional route payload", "",
          "The baseline includes these implementations in startup. The additional lazy payload follows all route imports and excludes startup files.", "",
          "| Route | Extra files | gzip bytes | Brotli bytes |", "| --- | ---: | ---: | ---: |"]
for route, key in [("Templates", "src/page/dashboards/templates/index.ts"), ("Dashboards", "src/page/dashboards/list/index.ts"), ("Agent session", "src/page/agent-sessions/session/index.ts")]:
    value = bundles[1]["lazy"][key]
    assert not value["inStartup"]
    lines.append(f"| {route} | {value['chunks']} | {value['gzip']:,} | {value['brotli']:,} |")
lines += ["", "The implementation payload follows static imports. Further conditional dynamic imports and workers are outside that closure; all emitted JavaScript is included in total output. The browser samples record what each representative cold load actually requests.", "",
          "| Cold route | Baseline observed gzip JS bytes | Lazy observed gzip JS bytes |", "| --- | ---: | ---: |"]
for route in routes:
    observed = [[sum(resource['encoded'] for resource in run['cold']['resources'] if resource['path'].endswith('.js')) for run in browser['runs'] if run['route'] == route] for browser in browsers]
    lines.append(f"| {names[route]} | {stats.median(observed[0]):,.0f} | {stats.median(observed[1]):,.0f} |")
lines += ["", "Observed bytes use native document Resource Timing encoded body sizes, without response headers. They include dynamic JavaScript requested through readiness, beyond the static startup closure.", "",
          "## Interpretation and regressions", "",
          f"The heavy route's median readiness changes from {stats.median(cold(browsers[0],'heavy','readyMs'))/1000:.1f}s to {stats.median(cold(browsers[1],'heavy','readyMs'))/1000:.1f}s ({100*(stats.median(cold(browsers[1],'heavy','readyMs'))/stats.median(cold(browsers[0],'heavy','readyMs'))-1):+.1f}%). Its observed readiness ranges do not overlap. Median main-thread script time falls {100*(1-stats.median(cold(browsers[1],'heavy','scriptDurationMs'))/stats.median(cold(browsers[0],'heavy','scriptDurationMs'))):.1f}%.", "",
          f"The lightweight route's median readiness rises from {stats.median(cold(browsers[0],'light','readyMs'))/1000:.1f}s to {stats.median(cold(browsers[1],'light','readyMs'))/1000:.1f}s ({100*(stats.median(cold(browsers[1],'light','readyMs'))/stats.median(cold(browsers[0],'light','readyMs'))-1):+.1f}%). Its ranges overlap. Dense-route readiness changes little at the median, with a slower optimized outlier.", "",
          "All three cached-navigation medians increase. Prefetched-navigation medians also increase, including a heavy-route outlier of about 44s. The outlier is retained in the range and raw samples. The dense route's automated action duration also increases, with non-overlapping observed ranges; this does not establish filtered-table completion latency. Retained heap falls only about 1–2%; code splitting provides little retained-memory benefit for these loaded routes.", "",
          "The code explains costs that warrant profiling: admission always requires a Command and completion even with warm code; Loading can produce an intermediate render; the compatibility adapter adds a Submodel view boundary; and a cold route implementation starts loading after route entry. Prefetch waits for its entry response and at least 1,200ms, which does not guarantee that all transitive module evaluation has completed. These mechanisms are established by the implementation. This experiment does not assign a causal share of the timing regression to each one.", "",
          "Keep the deterministic admission protocol. Follow-up performance work should profile the compatibility view boundary, render scheduling around warm admission, and the initial-route loading waterfall. Smaller startup bytes alone do not establish a uniformly faster router.", "",
          "The dense timed action fills and clears the search field, but its row-presence waits do not prove that filtering completed before reset. Its duration is an automation metric, not filter-render latency. Separate production-browser checks verify that a nonmatching row disappears and returns after reset on both artifacts. Templates and span selection already wait for changed visible content or selection state.", "",
          "## Dependency inspection", "",
          "A supplemental build emits the module/package graph. Its 643 JavaScript files are byte-identical to the measured optimized artifact. The emitted graph contains one physical Effect 4.1.2 instance. The only package with multiple emitted versions is d3-array (2.12.1 and 3.2.4), both present in the unchanged lockfile. Together those modules have 9,791 bundler-reported rendered bytes before output minification.", "",
          "Large retained startup modules include the generated icon collection (479,485 rendered bytes), the SDK flushable client (117,718), Electric's client chunk (113,469), the xyflow system module (105,879), and the domain query API descriptor (87,850). These are pre-minification attribution figures, not compressed payload measurements. The chunk/module graph is in `raw/module-graph.json`; `raw/identity-check.json` verifies artifact identity.", "",
          "## Conditions and limits", "",
          "- Chromium " + browsers[0]["browser"] + ", Node 24.22.1, Bun 1.4.4, Effect 4.1.2, Vite 8.3.5. The Bun lockfile is unchanged.",
          "- Linux cloud environment with a four-CPU quota. Browser CPU throttling is 4×. Network latency is 40ms, download is 1,500,000 bytes/s, and upload is 750,000 bytes/s.",
          "- Viewport is 1440×1000, locale is en-US, timezone is UTC. Date is fixed at 2026-11-04T12:00:10Z with a Date-only wrapper. Performance APIs, observers, and timers remain native.",
          "- Static files use gzip level 9. The server precompresses files before measurements. API responses use local deterministic fixtures. No live warehouse or hosted service participates.",
          "- Default production telemetry and replay remain enabled in both artifacts. The fixture server intercepts their ingestion requests, but recorder CPU work remains part of the workload. No real telemetry is sent.",
          "- The lightweight route has an empty template inventory. The dense route receives 500 dashboard rows. The heavy route receives 200 AI spans and opens Flow.",
          "- A separate 1,000-span pilot exposed substantial Flow layout cost. Its observation is retained in the raw pilot log and excluded from this comparison.",
          "- An earlier fixed-clock pilot suppressed resource timings. It is excluded. Both final variants were rerun with native timing APIs; the harness now rejects missing JavaScript resource timings.",
          "- Readiness requires loaded route content and two animation frames. This is a readiness proxy, not an INP measurement. Automated control actions follow the cold phase.",
          "- LCP records browser candidates through readiness plus 100ms. Script time uses CDP ScriptDuration. Parse/compilation sums non-overlapping elapsed trace intervals per thread, including background compiler work; this is not process CPU time.",
          "- Heap measurements force GC after the timed cold phase. This is JavaScript heap, excluding native DOM, GPU, and other process memory. The raw data also retains uncollected heap samples and resource timings.",
          "- Prefetch receives at least 1,200ms of lead time and waits for the implementation response. Lead times are recorded. Cached visits refer to module reuse; Playwright request routing disables HTTP cache.",
          "- Builds and browser measurements run without concurrent builds, tests, or compression jobs. Three samples reveal observed variability and do not establish tail latency or statistical significance.",
          "- Baseline runs precede optimized runs. This order does not control all host scheduling or thermal variation. Timing differences with overlapping ranges need caution.", "",
          "## Scope and architectural assessment", "",
          "Explicit contracts make discovery and typed import generation automatic. They also expose shared execution that prevents safe splitting. Schemas and shared runtime remain eager.", "",
          "Five retained pages need a prepared-data protocol. Shared embedded flows and Settings/MCP retain eager execution. The AlertEditor key needs an explicit boundary. These constraints preserve existing behavior.", "",
          "The host preserves Model–Message–Update composition through preparation facts. It owns a per-application code cache, instance guards, retry attempts, parked revival, and explicit restoration barriers.", "",
          "Runtime resumption reconstructs interrupted host preparation. Applications still own interrupted data Commands within admitted children. Development edits reset saved lazy state across build identities. Separate SSR/client identity coordination remains future integration work.", "",
          "The next API boundaries are prepared data with cache holding/release, asynchronous decoding that retains child validation, shared embedded Submodels, and earlier route-code preparation. View composition and warm-admission scheduling also need performance work. The current APIs establish typed ownership and admission; they do not automate those further protocols.", "",
          "Browser recovery reloads the document because Chromium retains failed import records. This loses transient parked state. The failure UI explains that behavior.", "",
          "This report does not establish competitiveness with TanStack Start. A valid comparison requires the same application, data, rendering work, and server conditions. Remaining eager schemas and API descriptors still consume substantial startup JavaScript.", "",
          "## Reproduction", "",
          "See [the benchmark procedure](../../../apps/web/perf/README.md). Raw build logs, manifests, compression results, browser samples, and verification results are adjacent in `raw/`. [Verification and review](verification.md) records test scope, independent reviews, and publication requirements.", ""]
(out / "report.md").write_text("\n".join(lines))
print("Wrote", out / "report.md")
