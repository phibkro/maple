import { BenchmarkError, parseJson, runBenchmark, stringifyJson } from "./json.mjs"
import assert from "node:assert/strict"
import { createServer } from "node:http"
import { readFileSync, readdirSync, writeFileSync } from "node:fs"
import { dirname, extname, join, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { gzipSync } from "node:zlib"
import { fixture, routes } from "./fixtures.mjs"

await runBenchmark("browser", async () => {
	const root = resolve(
		process.env.BENCH_MAPLE_ROOT ?? resolve(dirname(fileURLToPath(import.meta.url)), "../../.."),
	)
	const store = join(root, "node_modules/.bun")
	const playwright = readdirSync(store).find((name) => name.startsWith("playwright@"))
	if (!playwright)
		return Promise.reject(
			new BenchmarkError({
				operation: "browser",
				message: "Install workspace dependencies including Playwright first",
			}),
		)
	const { chromium } = await import(
		pathToFileURL(join(store, playwright, "node_modules/playwright/index.mjs"))
	)
	const directory = resolve(process.argv[2] ?? join(root, "apps/web/dist"))
	const output = process.argv[3] ?? "/tmp/maple-browser.json"
	const manifest = parseJson(readFileSync(join(directory, ".vite/manifest.json"), "utf8"))
	const implementation = {
		light: "src/page/dashboards/templates/index.ts",
		dense: "src/page/dashboards/list/index.ts",
		heavy: "src/page/agent-sessions/session/index.ts",
	}
	const samples = Number(process.env.BENCH_SAMPLES ?? 3)
	const smoke = process.argv.includes("--smoke")
	const verify = process.argv.includes("--verify")
	const mime = {
		".html": "text/html",
		".js": "text/javascript",
		".css": "text/css",
		".json": "application/json",
		".woff2": "font/woff2",
		".svg": "image/svg+xml",
		".png": "image/png",
	}
	const files = new Map()
	const warm = (dir) => {
		for (const name of readdirSync(dir, { withFileTypes: true })) {
			const path = join(dir, name.name)
			if (name.isDirectory()) warm(path)
			else if (mime[extname(path)]) files.set(path, gzipSync(readFileSync(path), { level: 9 }))
		}
	}
	warm(directory)
	const server = createServer((request, response) => {
		const pathname = decodeURIComponent(new URL(request.url, "http://fixture").pathname)
		let path = resolve(directory, `.${pathname}`)
		if (!path.startsWith(`${directory}/`) || !extname(path)) path = join(directory, "index.html")
		if (!files.has(path)) {
			response.writeHead(404)
			response.end()
			return
		}
		response.writeHead(200, {
			"content-type": mime[extname(path)],
			"content-encoding": "gzip",
			"cache-control": extname(path) === ".html" ? "no-cache" : "public,max-age=31536000,immutable",
		})
		response.end(files.get(path))
	})
	let browser
	try {
		// The OS assigns a fresh port, so the harness cannot probe a stale server.
		await new Promise((ready, reject) => {
			server.once("error", reject)
			server.listen(0, "127.0.0.1", ready)
		})
		const origin = `http://127.0.0.1:${server.address().port}`
		browser = await chromium.launch({
			executablePath: process.env.CHROMIUM_PATH ?? "/usr/bin/chromium",
			headless: true,
			args: ["--no-sandbox"],
		})
		const result = {
			browser: browser.version(),
			conditions: {
				viewport: [1440, 1000],
				locale: "en-US",
				timezone: "UTC",
				cpuRate: smoke ? 1 : 4,
				fixedDate: "2026-11-04T12:00:10.000Z",
				clock: "Date only; native performance APIs and timers",
				latencyMs: smoke ? 0 : 40,
				downloadBytesPerSecond: 1_500_000,
				uploadBytesPerSecond: 750_000,
				compression: "gzip 9",
				fixtureDashboards: 500,
				fixtureSpans: 200,
				samples,
				cache: "Fresh context per route/sample; module cache retained for client revisits. Request routing disables HTTP cache.",
			},
			runs: [],
			verification: [],
		}

		const createPage = async () => {
			const context = await browser.newContext({
				viewport: { width: 1440, height: 1000 },
				locale: "en-US",
				timezoneId: "UTC",
			})
			await context.addInitScript(() => {
				// Keep fixture dates stable without replacing browser performance APIs.
				const NativeDate = Date
				const fixedTime = NativeDate.parse("2026-11-04T12:00:10.000Z")
				const now = () => fixedTime
				globalThis.Date = new Proxy(NativeDate, {
					apply: () => new NativeDate(fixedTime).toString(),
					construct: (target, arguments_, newTarget) =>
						Reflect.construct(
							target,
							arguments_.length === 0 ? [fixedTime] : arguments_,
							newTarget,
						),
					get: (target, property) => (property === "now" ? now : target[property]),
				})
				sessionStorage.setItem("maple.self_hosted.token", "local-benchmark-fixture")
				performance.setResourceTimingBufferSize(10000)
				window.__bench = { lcp: null, longTasks: [] }
				new PerformanceObserver((list) => {
					for (const entry of list.getEntries()) window.__bench.lcp = entry.startTime
				}).observe({ type: "largest-contentful-paint", buffered: true })
				new PerformanceObserver((list) => {
					for (const entry of list.getEntries())
						window.__bench.longTasks.push({ start: entry.startTime, duration: entry.duration })
				}).observe({ type: "longtask", buffered: true })
			})
			const requests = [],
				errors = [],
				failures = []
			let interceptor = async () => false
			await context.route("**/*", async (route) => {
				const url = new URL(route.request().url())
				if (url.origin === origin) {
					if (await interceptor(route, url)) return
					return route.continue()
				}
				requests.push({ method: route.request().method(), path: url.pathname })
				const data = fixture(url, route.request().method())
				return route.fulfill({
					status: data.status ?? 200,
					headers: {
						"access-control-allow-origin": "*",
						"access-control-allow-headers": "*",
						"access-control-allow-methods": "*",
						"access-control-expose-headers":
							"electric-handle,electric-offset,electric-schema,electric-up-to-date",
						"content-type": "application/json",
						...data.headers,
					},
					body: data.body === undefined ? undefined : stringifyJson(data.body),
				})
			})
			const page = await context.newPage()
			page.on("pageerror", (error) => errors.push(String(error)))
			page.on("console", (message) => {
				if (message.type() === "error") errors.push(message.text())
			})
			page.on("requestfailed", (request) =>
				failures.push({
					path: new URL(request.url()).pathname,
					reason: request.failure()?.errorText,
				}),
			)
			const client = await context.newCDPSession(page)
			await client.send("Performance.enable")
			await client.send("Emulation.setCPUThrottlingRate", { rate: smoke ? 1 : 4 })
			if (!smoke)
				await client.send("Network.emulateNetworkConditions", {
					offline: false,
					latency: 40,
					downloadThroughput: 1_500_000,
					uploadThroughput: 750_000,
				})
			return {
				page,
				context,
				client,
				requests,
				errors,
				failures,
				intercept: (fn) => {
					interceptor = fn
				},
			}
		}
		const ready = async (page, route) => {
			const target = new URL(route.path, origin)
			await page.waitForURL(
				(url) =>
					url.origin === target.origin &&
					url.pathname === target.pathname &&
					[...target.searchParams].every(([key, value]) => url.searchParams.get(key) === value),
				{ timeout: 60000 },
			)
			const locator = route.text
				? page.locator(route.selector).filter({ hasText: route.text }).first()
				: page.locator(route.selector).first()
			await locator.waitFor({ state: "visible", timeout: 60000 })
			await page.evaluate(
				() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
			)
		}
		const clickLink = (page, path) =>
			page.evaluate((path) => {
				const anchor = document.createElement("a")
				anchor.href = path
				document.body.append(anchor)
				const start = performance.now()
				anchor.click()
				anchor.remove()
				return start
			}, path)
		const navigate = async (page, route) => {
			const epoch = await page.evaluate(() => performance.timeOrigin)
			const start = await clickLink(page, route.path)
			await ready(page, route)
			assert.equal(
				await page.evaluate(() => performance.timeOrigin),
				epoch,
				"Client navigation reloaded the document",
			)
			return page.evaluate((start) => performance.now() - start, start)
		}
		const metrics = async ({ page, client }) => {
			const { metrics } = await client.send("Performance.getMetrics")
			const value = (name) => metrics.find((metric) => metric.name === name)?.value
			return {
				...(await page.evaluate(() => ({
					...window.__bench,
					resources: performance.getEntriesByType("resource").map((entry) => ({
						path: new URL(entry.name).pathname,
						transfer: entry.transferSize,
						encoded: entry.encodedBodySize,
						duration: entry.duration,
					})),
				}))),
				scriptDurationMs: value("ScriptDuration") * 1000,
				taskDurationMs: value("TaskDuration") * 1000,
				heapUsedBytes: value("JSHeapUsedSize"),
				heapTotalBytes: value("JSHeapTotalSize"),
				nodes: value("Nodes"),
			}
		}
		const finishTrace = async (client) => {
			let completed
			const completion = new Promise((resolve) => {
				completed = resolve
			})
			client.once("Tracing.tracingComplete", completed)
			await client.send("Tracing.end")
			const { stream } = await completion
			let json = ""
			for (;;) {
				const { data, eof } = await client.send("IO.read", { handle: stream })
				json += data
				if (eof) break
			}
			await client.send("IO.close", { handle: stream })
			const events = parseJson(json).traceEvents.filter((event) => event.ph === "X" && event.dur)
			const unionDuration = (selected) => {
				let total = 0
				for (const thread of Map.groupBy(selected, (event) => `${event.pid}:${event.tid}`).values()) {
					let end = -Infinity
					for (const event of thread.sort((a, b) => a.ts - b.ts)) {
						total += Math.max(0, event.ts + event.dur - Math.max(end, event.ts))
						end = Math.max(end, event.ts + event.dur)
					}
				}
				return total / 1000
			}
			const compile = events.filter((event) =>
				/CompileScript|V8\.CompileCode|v8\.compile|V8\.Parse/.test(event.name),
			)
			return {
				compileAndParseMs: unionDuration(compile),
				evaluateScriptMs: unionDuration(events.filter((event) => event.name === "EvaluateScript")),
				compileEventNames: [...new Set(compile.map((event) => event.name))],
			}
		}
		try {
			for (
				let sample = 0;
				sample < (process.argv.includes("--verify-only") ? 0 : smoke ? 1 : samples);
				sample += 1
			)
				for (const route of routes) {
					const state = await createPage()
					try {
						await state.client.send("Tracing.start", {
							categories: "devtools.timeline,v8,disabled-by-default-v8.compile",
							transferMode: "ReturnAsStream",
						})
						await state.page.goto(`${origin}${route.path}`, {
							waitUntil: "domcontentloaded",
							timeout: 60000,
						})
						await ready(state.page, route)
						const readyMs = await state.page.evaluate(() => performance.now())
						await state.page.waitForTimeout(100)
						const cold = {
							readyMs,
							...(await metrics(state)),
							trace: await finishTrace(state.client),
						}
						assert.ok(
							cold.resources.some((resource) => resource.path.endsWith(".js")),
							"Native resource timings must include loaded JavaScript",
						)
						await state.client.send("HeapProfiler.collectGarbage")
						cold.retainedHeapUsedBytes = (await metrics(state)).heapUsedBytes
						const interactionStart = await state.page.evaluate(() => performance.now())
						if (route.id === "light") {
							const search = state.page.getByPlaceholder("Search templates…")
							await search.fill("latency")
							await state.page
								.getByText("No template matches “latency”", { exact: true })
								.waitFor()
							await search.fill("")
							await state.page.getByText("No template matches “”", { exact: true }).waitFor()
						}
						if (route.id === "heavy") {
							await state.page.locator("[data-span-id]").first().click()
							await state.page.locator('[data-span-id][aria-current="true"]').first().waitFor()
						}
						if (route.id === "dense") {
							const search = state.page.getByPlaceholder(/search/i).first()
							await search.fill("Benchmark dashboard 123")
							await state.page
								.locator("a")
								.filter({ hasText: "Benchmark dashboard 123" })
								.first()
								.waitFor()
							await search.fill("")
							await state.page
								.locator("a")
								.filter({ hasText: "Benchmark dashboard 000" })
								.first()
								.waitFor()
						}
						const interactionLatencyMs = await state.page.evaluate(
							(start) => performance.now() - start,
							interactionStart,
						)
						const away = routes[(routes.indexOf(route) + 1) % routes.length]
						const firstVisit = await navigate(state.page, away)
						const cachedVisit = await navigate(state.page, route)
						const remaining = routes.find(
							(other) => other.id !== route.id && other.id !== away.id,
						)
						const prefetchStart = await state.page.evaluate(() => performance.now())
						await state.page.evaluate((path) => {
							const anchor = document.createElement("a")
							anchor.id = "bench-prefetch"
							anchor.href = path
							anchor.textContent = "Benchmark prefetch"
							document.body.append(anchor)
							anchor.focus()
						}, remaining.path)
						await state.page.waitForTimeout(1200)
						const targetChunk = manifest[implementation[remaining.id]]
						if (targetChunk?.isDynamicEntry) {
							await state.page.waitForFunction(
								(path) =>
									performance
										.getEntriesByType("resource")
										.some((entry) => new URL(entry.name).pathname === path),
								`/${targetChunk.file}`,
								{ timeout: 30000 },
							)
						}
						const prefetchResources = (await metrics(state)).resources
							.filter((resource) => resource.path.endsWith(".js"))
							.map((resource) => resource.path)
						const prefetchLeadMs = await state.page.evaluate(
							(start) => performance.now() - start,
							prefetchStart,
						)
						const prefetchedVisit = await navigate(state.page, remaining)
						await state.page.evaluate(() => document.getElementById("bench-prefetch")?.remove())
						assert.deepEqual(state.errors, [], "Unexpected browser error")
						result.runs.push({
							sample,
							route: route.id,
							cold,
							interactionLatencyMs,
							prefetchLeadMs,
							firstVisit: { route: away.id, ms: firstVisit },
							cachedVisitMs: cachedVisit,
							prefetchedVisit: { route: remaining.id, ms: prefetchedVisit },
							prefetchResources,
							afterNavigation: await metrics(state),
							requests: state.requests,
							failures: state.failures,
						})
						console.log(
							stringifyJson({ sample, route: route.id, readyMs, cachedVisit, prefetchedVisit }),
						)
						if (smoke)
							await state.page.screenshot({
								path: output.replace(/\.json$/, `-${route.id}.png`),
							})
					} catch (error) {
						writeFileSync(
							`${output}.failure.json`,
							stringifyJson(
								{
									route,
									error: String(error),
									body: await state.page.locator("body").innerText(),
									errors: state.errors,
									requests: state.requests,
									failures: state.failures,
								},
								null,
								2,
							),
						)
						return Promise.reject(error)
					} finally {
						await state.context.close()
					}
				}
			if (process.argv.includes("--verify-filter")) {
				const state = await createPage()
				try {
					await state.page.goto(`${origin}${routes[1].path}`)
					await ready(state.page, routes[1])
					const search = state.page.getByPlaceholder(/search/i).first()
					const nonmatching = state.page
						.locator("a")
						.filter({ hasText: "Benchmark dashboard 000" })
						.first()
					await search.fill("Benchmark dashboard 123")
					await nonmatching.waitFor({ state: "hidden" })
					await state.page
						.locator("a")
						.filter({ hasText: "Benchmark dashboard 123" })
						.first()
						.waitFor({ state: "visible" })
					await search.fill("")
					await nonmatching.waitFor({ state: "visible" })
					assert.deepEqual(state.errors, [])
					result.verification.push("Dense filter removes a nonmatching row and reset restores it")
				} finally {
					await state.context.close()
				}
			}
			if (process.argv.includes("--verify-document")) {
				const state = await createPage()
				try {
					await state.page.goto(`${origin}${routes[0].path}`)
					await ready(state.page, routes[0])
					const capture = async (route) => {
						if (process.argv.includes("--screenshots"))
							await state.page.screenshot({
								path: output.replace(/\.json$/, `-${route.id}.png`),
							})
					}
					await capture(routes[0])
					const loaderId = async () =>
						(await state.client.send("Page.getFrameTree")).frameTree.frame.loaderId
					const original = await loaderId()
					for (const route of routes.slice(1)) {
						await navigate(state.page, route)
						await capture(route)
						assert.equal(
							await loaderId(),
							original,
							"Client navigation replaced the native document loader",
						)
					}
					await state.page.evaluate(() => history.back())
					await ready(state.page, routes[1])
					assert.equal(await loaderId(), original)
					await state.page.evaluate(() => history.forward())
					await ready(state.page, routes[2])
					assert.equal(await loaderId(), original)
					assert.deepEqual(state.errors, [])
					result.verification.push(
						"Native CDP document loader is unchanged across route clicks, Back and Forward",
					)
				} finally {
					await state.context.close()
				}
			}
			if (verify) {
				const state = await createPage()
				try {
					const [light, dense, heavy] = routes
					await state.page.goto(`${origin}${light.path}`)
					await ready(state.page, light)
					await navigate(state.page, dense)
					await state.page.evaluate(() => history.back())
					await ready(state.page, light)
					await state.page.evaluate(() => history.forward())
					await ready(state.page, dense)
					result.verification.push("Direct links, search interaction, Back and Forward")
					await navigate(state.page, light)
					const manifest = parseJson(readFileSync(join(directory, ".vite/manifest.json"), "utf8"))
					const chunk = manifest["src/page/agent-sessions/session/index.ts"]?.file
					assert.ok(chunk, "Expected generated AgentSession implementation entry")
					let release, requested
					const hold = new Promise((resolve) => {
						release = resolve
					})
					const requestStarted = new Promise((resolve) => {
						requested = resolve
					})
					state.intercept(async (request, url) => {
						if (url.pathname === `/${chunk}`) {
							requested()
							await hold
							await request.continue()
							return true
						}
						return false
					})
					await clickLink(state.page, heavy.path)
					await requestStarted
					await navigate(state.page, dense)
					await clickLink(state.page, heavy.path)
					release()
					await ready(state.page, heavy)
					result.verification.push("Delayed implementation across A -> B -> A")
				} finally {
					await state.context.close()
				}
				const state2 = await createPage()
				try {
					const manifest = parseJson(readFileSync(join(directory, ".vite/manifest.json"), "utf8"))
					const chunk = manifest["src/page/agent-sessions/session/index.ts"].file
					let aborted = false
					state2.intercept(async (request, url) => {
						if (!aborted && url.pathname === `/${chunk}`) {
							aborted = true
							await request.abort("failed")
							return true
						}
						return false
					})
					await state2.page.goto(`${origin}${routes[2].path}`)
					await state2.page.getByText("Unable to load this page.", { exact: true }).waitFor()
					await state2.page.getByRole("button", { name: "Retry", exact: true }).click()
					await ready(state2.page, routes[2])
					assert.equal(aborted, true)
					assert.deepEqual(
						state2.errors.filter((error) => !/Failed to load resource/.test(error)),
						[],
					)
					result.verification.push("Real route chunk abort, failure UI and successful Retry")
				} catch (error) {
					writeFileSync(
						`${output}.retry-failure.json`,
						stringifyJson(
							{
								error: String(error),
								body: await state2.page.locator("body").innerText(),
								errors: state2.errors,
								requests: state2.requests,
								failures: state2.failures,
							},
							null,
							2,
						),
					)
					return Promise.reject(error)
				} finally {
					await state2.context.close()
				}
			}
		} finally {
			writeFileSync(output, stringifyJson(result, null, 2))
		}
	} finally {
		try {
			await browser?.close()
		} finally {
			if (server.listening)
				await new Promise((resolve, reject) =>
					server.close((error) => (error ? reject(error) : resolve())),
				)
		}
	}
})
