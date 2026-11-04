# Verification and review

The application integration is Maple `484e997690ab3282819bdddc17786c4137257cef`, compared with `084ee139d0ad63e563820f547016fccbab4c3f43`. The framework implementation is Foldkit `1ef1c4f7aef25af7e24a09b27048238c2a27fa5d`, based on upstream v0.170 (`a471adb2`). The evidence commit adds tooling and documents without changing the measured application.

## Application checks

- The complete feature web suite passed: 391 files and 3,439 tests. This run preceded the final source-metadata regression fix and the restore-resumption refinement.
- The final application typecheck, including its e2e TypeScript configuration, passed.
- The final focused suite passed: 10 files and 144 tests. It covers root navigation, lazy admission, revival, parked instances, data preloads, widget leave behavior, customer grace, pending tasks, and views.
- The final prefetch recovery simplification passed its three adapter tests. Typed lint and generated-catalog checks passed for the affected application and scripts.
- The source-metadata regression fails when its admission guard is removed. The host's stale-instance regression also fails when its instance guard is removed.
- Baseline typecheck and production builds passed. Its complete suite had 3,434 passing tests and two timeouts under contention. Both timed-out files passed alone with one worker (28 tests). This is a baseline timing limitation, not a claimed clean baseline full-suite run.

The final focused suite provides the evidence for the last application changes. The earlier complete run establishes broad feature coverage; it is not reported as an exact final-commit rerun.

## Framework checks

The framework builds, core typecheck, plugin typecheck, targeted typed lint, and formatting passed. Real Vite tests cover generated catalog freshness, unsafe import diagnostics, emitted startup separation, production identities, transitive development edits, and configurable implementation filenames.

The normal repository-wide pre-push gate at Foldkit `05d35a0ec32dd03264d5cb09cc8791aadf34a8f3` passed the complete core suite with coverage: 113 files, 3,043 tests, and one existing skipped file/test. It used one worker. The measured runtime source is unchanged from `1ef1c4f7`; subsequent changes retain typed decoding in one test and support labeled tuples in the website API renderer.

Earlier complete attempts remain in the evidence. One passed 3,042 cases and failed a hydration-containment assertion within its polling deadline; the whole 58-test hydration file then passed alone. Another passed 2,999 cases but could not start the calendar worker; its 44 cases passed alone. The later clean pre-push run resolves the uncertainty about a complete core invocation.

An exploratory thread-pool run hit existing embed timing assertions and was stopped. The configured fork-pool results above are the relevant core evidence. No framework source or assertions were changed to make these runs pass.

The normal pre-push gate also passed the complete Vite plugin suite: 18 files, 337 tests, and four existing skips, with its standard test deadlines. An earlier standalone pass used one worker and 30-second runner/hook deadlines after build cases exceeded the default five-second deadline. Focused host/runtime tests also passed all 18 cases across four files. Full attempts and isolated rerun logs are in `raw/validation/`.

The complete repository pre-push gate passed before both Foldkit branches were published. It includes formatting, strict lint, dependency/boundary checks, all workspace builds and typechecks, package/example tests, and the website's 1,313 tests. The repository's website-e2e wrapper skipped browser tests because its managed Playwright browsers were absent. This is not a claimed website browser-suite pass. The full gate and push log is [foldkit-pre-push.log](raw/validation/foldkit-pre-push.log).

Mutation checks detect removal of each of these behaviors:

- Stale-instance admission guards.
- Interrupted preparation resumption after restoration.
- A preparation barrier that leaves Failed hosts available without loading code.
- Typed prefetch failures.
- Preparation before initial synchronous rendering.
- Subscription cleanup before replacement.
- Shell source refresh when a lazy page first exposes source metadata.

All mutated source was restored before the final build. Relevant failure logs are in `raw/`.

## Browser checks

The final production artifact passes native document identity checks across client route clicks, Back, and Forward. Separate checks pass delayed chunk loading across A → B → A and a real aborted chunk followed by failure UI and successful Retry. Retry deliberately reloads the document because Chromium caches failed native imports.

The browser harness rejects unexpected errors during timed runs. It asserts native JavaScript resource timings and loaded content. Templates and span-selection actions wait for changed visible state. The dense timed action is reported only as automation duration because it does not prove completed filtering. Separate production-browser checks wait for a nonmatching row to disappear and return after reset. The report's raw JSON preserves per-run results and verification outcomes. Before/after screenshots use identical fixtures and are byte-identical on all three routes.

An excluded pilot exposed a harness error: Playwright's fixed-clock wrapper suppressed resource timings. The final comparison reruns both artifacts with a Date-only wrapper and native timers/performance APIs. A separate excluded 1,000-span pilot exposed substantial Flow layout work. Neither pilot contributes samples to the comparison.

## Standards review

Independent review approved exact Maple integration commit `484e997690ab3282819bdddc17786c4137257cef`. Script failures use namespaced Schema errors through Effect's typed channel. One shared helper now builds child envelopes from primitive identity fields. Final typed lint adjustments preserve behavior. No remaining integration findings were reported.

The benchmark tooling received a separate review. Its two findings were fixed: the analyzer writes the documented output filename, and browser/server cleanup covers launch and artifact-write failures. The reviewer approved those fixes. Both cleanup failure paths exit correctly in execution checks. Changed-source typed lint, catalog freshness, UI index, UI patterns, and analyzer tests pass. Failure-path execution checks are retained with the other evidence.

## Spec review

Independent review approved the same exact integration commit. The source-admission finding was fixed and tested through the real root transition from Loading to Ready. The test verifies a source-refresh Command and prevents duplicate refresh when metadata is unchanged. The reviewer also checked infrastructure-settled behavior during loading and found no lost behavior.

Foldkit received an independent exact-commit review of `1ef1c4f7aef25af7e24a09b27048238c2a27fa5d`. All findings were addressed before approval. The later test-only commit `db9bf5c6` and website API-renderer fix `05d35a0e` also received independent exact-commit approval. The website regression tests failed before the fix and passed afterward; its full build, typecheck, and strict targeted lint passed. These follow-up commits do not change the measured runtime.

Review summary: no remaining integration findings on either axis. Two benchmark tooling findings were fixed and approved. The dense timing claim was narrowed and a separate completed-filter check was added after spec review; both artifacts pass it. The configured tracker file `docs/agents/issue-tracker.md` is absent; `/setup-matt-pocock-skills` can configure future issue-linked reviews.

## Publication

All implementation branches are pushed: Maple `feat/automatic-route-splitting`, Foldkit `chore/sync-upstream-v170`, and Foldkit `feat/lazy-submodel-host-v170`. PR text is prepared, but no PR has been created. GitHub API access is blocked by the environment proxy before authentication (`CONNECT` receives HTTP 403 from Envoy). Actual draft-PR creation attempts return Forbidden. A cloud configuration draft allows `api.github.com`, but that draft must be published before the rule applies. This result does not establish an invalid GitHub credential.

Foldkit's fork main is older than Maple's installed v0.170 packages. The local `chore/sync-upstream-v170` branch supplies that prerequisite. The framework feature branch is `feat/lazy-submodel-host-v170`; Maple's branch is `feat/automatic-route-splitting`. Publication must preserve the small feature diff against the v0.170 prerequisite.

Maple retains its published package versions and unchanged lockfile for the controlled comparison. Reviewing this branch requires the documented local Foldkit overlay. The Maple PR must remain a draft until the new framework/plugin versions are released and its pinned dependencies can be updated. This work does not run a package release.
