// Frontend-only benchmark data. No live warehouse, credentials or customer data.
const timestamp = "2026-11-04T12:00:00.000Z"
export const dashboards = Array.from({ length: 500 }, (_, index) => ({
	org_id: "org_bench",
	id: `dash_bench_${index}`,
	name: `Benchmark dashboard ${String(index).padStart(3, "0")}`,
	payload_json: {
		id: `dash_bench_${index}`,
		name: `Benchmark dashboard ${String(index).padStart(3, "0")}`,
		timeRange: { type: "relative", value: "6h" },
		widgets: [],
		tags: ["benchmark", `team-${index % 10}`],
		createdAt: timestamp,
		updatedAt: timestamp,
		schemaVersion: 3,
	},
	created_at: timestamp,
	updated_at: timestamp,
	created_by: "user_bench",
	updated_by: "user_bench",
	version: 1,
}))
export const spans = Array.from({ length: 200 }, (_, index) => ({
	traceId: "1".repeat(32),
	spanId: (index + 1).toString(16).padStart(16, "0"),
	parentSpanId: index === 0 ? "" : "0000000000000001",
	spanName: `Benchmark step ${index}`,
	spanKind: "Client",
	serviceName: "benchmark-agent",
	timestamp: `2026-11-04 12:00:${String(Math.floor(index / 100)).padStart(2, "0")}.${String(index % 100).padStart(3, "0")}000000`,
	durationMs: 50,
	statusCode: "Ok",
	statusMessage: "",
	sessionId: "bench-session",
	vendorId: "openai",
	isAiSpan: true,
	genAi: {
		operationName: index === 0 ? "invoke_agent" : "chat",
		requestModel: "benchmark-model",
		agentName: "Benchmark agent",
	},
}))
export const fixture = (url, method) => {
	if (method === "OPTIONS") return { status: 204 }
	if (url.pathname === "/api/auth/session")
		return {
			body: { orgId: "org_bench", userId: "user_bench", roles: ["org:admin"], authMode: "self_hosted" },
		}
	if (url.pathname === "/api/sync/shape")
		return {
			headers: {
				"electric-handle": "fixture",
				"electric-offset": "1000_0",
				"electric-schema": "{}",
				"electric-up-to-date": "",
			},
			body: [
				...(url.searchParams.get("shape") === "dashboards" && !url.searchParams.has("handle")
					? dashboards.map((value, index) => ({
							key: value.id,
							value,
							offset: `${index + 1}_0`,
							headers: { operation: "insert", relation: ["public", "dashboards"] },
						}))
					: []),
				{ headers: { control: "up-to-date" } },
			],
		}
	if (url.pathname.includes("/ai-sessions/spans")) return { body: { data: spans } }
	if (url.pathname.includes("/ai-sessions/summary"))
		return {
			body: {
				spanCount: 200,
				aiSpanCount: 200,
				traceCount: 1,
				startTime: "2026-11-04 12:00:00",
				endTime: "2026-11-04 12:00:10",
				durationMs: 10000,
				llmCalls: 199,
				toolCalls: 0,
				errorSpanCount: 0,
				tokens: { input: 10000, output: 5000, cacheRead: 0 },
				tokenReporting: "per-call",
				models: ["benchmark-model"],
				agentNames: ["Benchmark agent"],
				turns: [],
				turnsTruncated: false,
			},
		}
	if (url.pathname.includes("/v2/"))
		return { body: { object: "list", data: [], has_more: false, next_cursor: null } }
	if (url.pathname.endsWith("/infra-surfaces")) return { body: { surfaces: [] } }
	if (url.pathname.includes("/metrics")) return { body: { data: [] } }
	// Background shell requests are recorded in the output for fixture auditing.
	return { body: {} }
}

export const routes = [
	{ id: "light", path: "/dashboards/templates", selector: "body", text: "No template matches" },
	{ id: "dense", path: "/dashboards", selector: "a", text: "Benchmark dashboard 000" },
	{ id: "heavy", path: "/agent-sessions/bench-session?view=flow", selector: "[data-span-id]" },
]
